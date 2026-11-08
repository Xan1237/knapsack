"""Users' saved trips, stored in Supabase. Only this server can reach the table.

The secret key bypasses row-level security, so every query here is filtered by the user id
taken from a verified access token, never by anything the app sends.
"""

import json
import os
import uuid
from datetime import datetime, timezone

import httpx

_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
_secret = os.environ.get("SUPABASE_SECRET_KEY", "")
MAX_TRIP_BYTES = 4 * 1024 * 1024
MAX_TRIPS = 20
EMPTY_STATE = {"items": [], "photos": [], "bagId": "cabin", "dismissed": [], "demo": False}
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


def _request(method: str, params: dict, **kwargs) -> httpx.Response:
    try:
        response = _client.request(method, f"{_url}/rest/v1/trips", params=params, **kwargs)
    except httpx.HTTPError as error:
        raise TripError(502, "Couldn't reach the trip database. Please retry.") from error
    if response.status_code >= 400:
        raise TripError(502, "The trip database refused the request. Please retry.")
    return response


def _millis(stamp: str) -> int:
    return int(datetime.fromisoformat(stamp).timestamp() * 1000)


def _trip_id(value: str) -> str:
    try:
        return str(uuid.UUID(value))
    except (ValueError, TypeError) as error:
        raise TripError(404, "That trip doesn't exist.") from error


def _name(value: object) -> str:
    name = value.strip() if isinstance(value, str) else ""
    if not 1 <= len(name) <= 60:
        raise TripError(400, "Give the trip a name of up to 60 characters.")
    return name


def _owned(user_id: str, trip_id: str) -> dict:
    return {"id": f"eq.{_trip_id(trip_id)}", "user_id": f"eq.{user_id}"}


def _summary(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "updatedAt": _millis(row["updated_at"]),
        "itemCount": row.get("item_count") or 0,
    }


def list_trips(user_id: str) -> list[dict]:
    rows = _request(
        "GET",
        {"user_id": f"eq.{user_id}", "select": "id,name,updated_at,item_count", "order": "updated_at.desc"},
        headers=_headers(),
    ).json()
    return [_summary(r) for r in rows]


def create(user_id: str, name: object) -> dict:
    clean = _name(name)
    if len(list_trips(user_id)) >= MAX_TRIPS:
        raise TripError(400, f"You can have up to {MAX_TRIPS} trips. Delete one to make another.")
    rows = _request(
        "POST",
        {"select": "id,name,updated_at,item_count"},
        headers=_headers({"Prefer": "return=representation"}),
        json={"user_id": user_id, "name": clean, "state": EMPTY_STATE},
    ).json()
    return _summary(rows[0])


def load(user_id: str, trip_id: str) -> dict:
    rows = _request(
        "GET", {**_owned(user_id, trip_id), "select": "id,name,state,updated_at"}, headers=_headers()
    ).json()
    if not rows:
        raise TripError(404, "That trip doesn't exist.")
    row = rows[0]
    return {"id": row["id"], "name": row["name"], "state": row["state"], "updatedAt": _millis(row["updated_at"])}


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


def _update(user_id: str, trip_id: str, fields: dict) -> None:
    rows = _request(
        "PATCH",
        {**_owned(user_id, trip_id), "select": "id"},
        headers=_headers({"Prefer": "return=representation"}),
        json=fields,
    ).json()
    if not rows:
        raise TripError(404, "That trip doesn't exist.")


def save(user_id: str, trip_id: str, state: object, updated_at: object) -> None:
    if not isinstance(updated_at, (int, float)) or updated_at <= 0:
        raise TripError(400, "That trip could not be read.")
    stamp = datetime.fromtimestamp(updated_at / 1000, tz=timezone.utc).isoformat()
    _update(user_id, trip_id, {"state": _clean(state), "updated_at": stamp})


def rename(user_id: str, trip_id: str, name: object) -> None:
    _update(user_id, trip_id, {"name": _name(name)})


def delete(user_id: str, trip_id: str) -> list[str]:
    """Delete a trip; returns its photo ids so the phone can remove the matching files."""
    rows = _request(
        "DELETE",
        {**_owned(user_id, trip_id), "select": "state"},
        headers=_headers({"Prefer": "return=representation"}),
    ).json()
    if not rows:
        raise TripError(404, "That trip doesn't exist.")
    photos = rows[0]["state"].get("photos", []) if isinstance(rows[0]["state"], dict) else []
    return [p["id"] for p in photos if isinstance(p, dict) and isinstance(p.get("id"), str)]
