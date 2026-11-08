"""Each user's saved trip, stored in Supabase. Only this server can reach the table.

The secret key bypasses row-level security, so every query here is filtered by the user id
taken from a verified access token, never by anything the app sends.
"""

import json
import os
from datetime import datetime, timezone

import httpx

_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
_secret = os.environ.get("SUPABASE_SECRET_KEY", "")
MAX_TRIP_BYTES = 4 * 1024 * 1024
_client = httpx.Client(timeout=15)


class TripError(Exception):
    def __init__(self, status: int, message: str):
        self.status = status
        self.message = message


def is_configured() -> bool:
    return bool(_url and _secret)


def _headers(extra: dict | None = None) -> dict:
    # Secret keys go on the apikey header only; they are not JWTs.
    return {"apikey": _secret, "Content-Type": "application/json", **(extra or {})}


def _request(method: str, path: str, **kwargs) -> httpx.Response:
    try:
        response = _client.request(method, f"{_url}/rest/v1/{path}", **kwargs)
    except httpx.HTTPError as error:
        raise TripError(502, "Couldn't reach the trip database. Please retry.") from error
    if response.status_code >= 400:
        raise TripError(502, "The trip database refused the request. Please retry.")
    return response


def load(user_id: str) -> dict | None:
    rows = _request(
        "GET",
        "trips",
        params={"user_id": f"eq.{user_id}", "select": "state,updated_at"},
        headers=_headers(),
    ).json()
    if not rows:
        return None
    updated = datetime.fromisoformat(rows[0]["updated_at"])
    return {"state": rows[0]["state"], "updatedAt": int(updated.timestamp() * 1000)}


def _clean(state: object) -> dict:
    """Accept only the trip shape the app writes, without photo file paths."""
    if not isinstance(state, dict):
        raise TripError(400, "That trip could not be read.")
    for key in ("items", "photos", "dismissed"):
        if not isinstance(state.get(key), list):
            raise TripError(400, "That trip could not be read.")
    if not isinstance(state.get("bagId"), str):
        raise TripError(400, "That trip could not be read.")
    if len(state["items"]) > 80 or len(state["photos"]) > 12:
        raise TripError(400, "That trip has more items or photos than the app allows.")
    photos = [{**p, "url": ""} if isinstance(p, dict) else p for p in state["photos"]]
    allowed = ("items", "photos", "bagId", "dismissed", "demo", "customBag")
    clean = {k: state[k] for k in allowed if k in state}
    clean["photos"] = photos
    if len(json.dumps(clean)) > MAX_TRIP_BYTES:
        raise TripError(413, "This trip is too large to save to your account.")
    return clean


def save(user_id: str, state: object, updated_at: object) -> None:
    if not isinstance(updated_at, (int, float)) or updated_at <= 0:
        raise TripError(400, "That trip could not be read.")
    stamp = datetime.fromtimestamp(updated_at / 1000, tz=timezone.utc).isoformat()
    _request(
        "POST",
        "trips",
        params={"on_conflict": "user_id"},
        headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
        json={"user_id": user_id, "state": _clean(state), "updated_at": stamp},
    )
