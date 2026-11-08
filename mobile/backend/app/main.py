"""Knapsack API. Credentials stay here; uploaded photos are never written to disk by the app."""

import base64
import logging
import os
import threading
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from pydantic import Field, ValidationError

from .choices import find_packing_choices
from .collection import PhotoRecord, import_collection
from .demo import demo_bottle_space
from .domain import PackingInput
from .packing import pack
from .validate import validate_plan

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from . import astra, auth, trips  # noqa: E402  (they read their settings after .env loads)

MAX_PHOTO_BYTES = 6 * 1024 * 1024
MAX_ACTIVE_ANALYSES = 2
_active = 0
_active_lock = threading.Lock()
# Native apps send no Origin header. Browsers do, so this keeps other sites from calling a
# LAN-visible server and spending the API key. Allow a web preview with ALLOWED_ORIGINS.
_allowed_origins = [o for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o]

app = FastAPI(title="Knapsack API")

if _allowed_origins:
    app.add_middleware(
        CORSMiddleware, allow_origins=_allowed_origins, allow_methods=["*"], allow_headers=["*"]
    )


@app.middleware("http")
async def reject_foreign_browsers(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin and origin not in _allowed_origins:
        return JSONResponse({"error": "This API accepts requests from the Knapsack app."}, 403)
    return await call_next(request)


@app.middleware("http")
async def require_signed_in_user(request: Request, call_next):
    # Everything under /api spends server resources or the OpenAI key, so it needs a user.
    if request.url.path.startswith("/api/") and request.method != "OPTIONS":
        if not auth.is_configured():
            return JSONResponse({"error": "Sign-in isn't configured on the server (SUPABASE_URL)."}, 503)
        header = request.headers.get("authorization")
        user_id = await run_in_threadpool(auth.user_id, header)
        if not user_id:
            return JSONResponse({"error": "Please sign in again."}, 401)
        # Routes read the verified user from here, never from the request body.
        request.state.user_id = user_id
    return await call_next(request)


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        self.status = status
        self.message = message


@app.exception_handler(ApiError)
async def on_api_error(_: Request, error: ApiError):
    return JSONResponse({"error": error.message}, error.status)


@app.exception_handler(RequestValidationError)
async def on_invalid_request(request: Request, error: RequestValidationError):
    # Log where validation failed, without the submitted values.
    reasons = [f"{'.'.join(str(p) for p in e.get('loc', ()))}: {e.get('msg')}" for e in error.errors()[:5]]
    logging.getLogger("uvicorn.error").warning("invalid %s: %s", request.url.path, "; ".join(reasons))
    message = (
        "Choose a JPEG, PNG or WebP photo up to 6 MB."
        if request.url.path == "/api/analyze"
        else "The packing inventory could not be read. Try importing it again."
    )
    return JSONResponse({"error": message}, 400)


@app.get("/health")
def health():
    return {"ok": True}


@app.exception_handler(trips.TripError)
async def on_trip_error(_: Request, error: trips.TripError):
    return JSONResponse({"error": error.message}, error.status)


def _require_trips():
    if not trips.is_configured():
        raise ApiError(503, "Trip saving isn't configured on the server (SUPABASE_SECRET_KEY).")


@app.get("/api/trip")
def get_trip(request: Request):
    _require_trips()
    return {"trip": trips.load(request.state.user_id)}


@app.post("/api/trip")
def save_trip(request: Request, body: dict = Body(...)):
    _require_trips()
    trips.save(request.state.user_id, body.get("state"), body.get("updatedAt"))
    return {"ok": True}


@app.get("/api/astra/status")
def astra_status():
    return {"configured": astra.is_configured(), "model": astra.model_name()}


class PackRequest(PackingInput):
    demo: bool = False


@app.post("/api/pack")
def pack_route(body: PackRequest):
    try:
        plan = pack(body.items, body.bag)
    except ValueError as error:
        raise ApiError(400, str(error))
    if not validate_plan(plan, body.items, body.bag)[0]:
        raise ApiError(
            422, "This layout did not pass validation. Change an item or retry packing."
        )
    space = demo_bottle_space(body.items, body.bag, plan) if body.demo else None
    return {
        "plan": plan.to_json(body.revision),
        "reservedSpace": space.to_json() if space else None,
    }


class ChoicesRequest(PackingInput):
    wanted_id: str


@app.post("/api/packing/choices")
def choices_route(body: ChoicesRequest):
    try:
        options = find_packing_choices(body.items, body.bag, body.wanted_id)
    except ValueError:
        raise ApiError(
            400, "A swap could not be calculated. Try a larger bag or leave an optional item out."
        )
    return {"revision": body.revision, "options": options}


@app.post("/api/astra/suggest")
def suggest_route(body: PackingInput):
    if not astra.is_configured():
        raise ApiError(503, "Astra isn't connected yet. Packing and item swaps still work.")
    try:
        advice = astra.suggest_packing(
            body.items, body.bag, body.preference or "Help me choose what to pack."
        )
    except Exception:
        raise ApiError(
            502, "Astra could not finish that suggestion. Your list is safe; please try again."
        )
    return {**advice, "revision": body.revision}


def _matches_type(content_type: str, data: bytes) -> bool:
    if content_type == "image/jpeg":
        return data[:2] == b"\xff\xd8"
    if content_type == "image/png":
        return data[:8] == b"\x89PNG\r\n\x1a\n"
    return data[:4] == b"RIFF" and data[8:12] == b"WEBP"


@app.post("/api/analyze")
def analyze_route(request: Request, photo: UploadFile = File(...)):
    global _active
    if not astra.is_configured():
        raise ApiError(
            503,
            "Photo analysis is not configured. Set OPENAI_API_KEY on the server. "
            "You can still add items manually or load the demo.",
        )
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_PHOTO_BYTES + 65536:
        raise ApiError(413, "Choose a photo smaller than 6 MB.")
    with _active_lock:
        if _active >= MAX_ACTIVE_ANALYSES:
            raise ApiError(429, "Photo analysis is busy. Please retry shortly.")
        _active += 1
    try:
        data = photo.file.read(MAX_PHOTO_BYTES + 1)
        content_type = photo.content_type or ""
        if (
            content_type not in ("image/jpeg", "image/png", "image/webp")
            or not data
            or len(data) > MAX_PHOTO_BYTES
        ):
            raise ApiError(400, "Choose a JPEG, PNG or WebP photo up to 6 MB.")
        if not _matches_type(content_type, data):
            raise ApiError(400, "The photo contents do not match its image type.")
        encoded = base64.b64encode(data).decode("ascii")
        return astra.analyze_photo(f"data:{content_type};base64,{encoded}")
    except ApiError:
        raise
    except Exception as error:
        # Do not log provider payloads, source photos or credentials.
        message = str(error).lower()
        raise ApiError(
            502,
            "Astra took too long creating the 3D mesh. Retry with a photo of fewer items, or add items manually."
            if "timeout" in message or "timed out" in message
            else "Astra could not create a valid 3D mesh from this photo. Retry, or add items manually. Your existing inventory is safe.",
        )
    finally:
        with _active_lock:
            _active -= 1


class ExportRequest(PackingInput):
    photos: list[PhotoRecord] = Field(default_factory=list, max_length=12)


@app.post("/api/packing/export")
def export_route(body: ExportRequest):
    plan = pack(body.items, body.bag)
    if not validate_plan(plan, body.items, body.bag)[0]:
        raise ApiError(
            400, "Your packing plan could not be exported. Return to the workspace and try again."
        )
    return {
        "schemaVersion": 1,
        "units": "mm",
        "upAxis": "z",
        "bag": body.bag.model_dump(by_alias=True, exclude_none=True),
        "items": [i.model_dump(by_alias=True, exclude_none=True) for i in body.items],
        "photos": [p.model_dump(by_alias=True, exclude_none=True) for p in body.photos],
        "plan": plan.to_json(),
        "estimated": True,
        "algorithm": "bounded-clamshell-priority-extreme-edge-v1"
        if body.bag.clamshell
        else "bounded-priority-extreme-edge-v1",
    }


@app.post("/api/collection/import")
def import_route(body: dict = Body(...)):
    try:
        return import_collection(body)
    except (ValueError, ValidationError, TypeError, AttributeError):
        raise ApiError(
            400,
            "That collection could not be read. Use a Knapsack export or the older collection format.",
        )
