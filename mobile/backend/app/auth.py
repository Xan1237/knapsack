"""Verify Supabase access tokens locally against the project's published signing keys."""

import os

import jwt

_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
_issuer = f"{_url}/auth/v1"
# PyJWKClient caches the key set, so only the first request (or a key rotation) fetches it.
_keys = jwt.PyJWKClient(f"{_issuer}/.well-known/jwks.json", cache_keys=True, lifespan=600) if _url else None


def is_configured() -> bool:
    return _keys is not None


def user_id(authorization: str | None) -> str | None:
    """The signed-in user's id for a valid `Bearer` token, or None."""
    if not _keys or not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    try:
        key = _keys.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=_issuer,
        )
    except jwt.PyJWTError:
        return None
    return claims.get("sub")
