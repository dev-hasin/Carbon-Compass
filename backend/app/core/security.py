"""
Auth primitives built on the standard library only (no new dependencies):
- Password hashing: PBKDF2-HMAC-SHA256 with per-user random salt.
- Access tokens: JWT-structure (header.payload.signature) signed with HMAC-SHA256.
- Token signing secret: taken from AUTH_SECRET when explicitly configured, otherwise
  a random secret is generated once and persisted to data/auth_secret.key.
"""
import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from pathlib import Path
from typing import Optional

from app.core.config import DEFAULT_AUTH_SECRET, get_settings

logger = logging.getLogger(__name__)

PBKDF2_ITERATIONS = 240_000

_persisted_secret: Optional[str] = None


def _auth_secret() -> str:
    """Resolve the token-signing secret.

    Precedence:
    1. AUTH_SECRET explicitly configured (anything other than the known default).
    2. A random secret persisted to auth_secret_file, generated on first use.
    3. The known default (last resort, logged loudly) if the file is unwritable.
    """
    global _persisted_secret
    if _persisted_secret:
        return _persisted_secret

    settings = get_settings()
    if settings.auth_secret and settings.auth_secret != DEFAULT_AUTH_SECRET:
        _persisted_secret = settings.auth_secret
        return _persisted_secret

    path = Path(settings.auth_secret_file)
    try:
        if path.exists():
            stored = path.read_text(encoding="utf-8").strip()
            if stored:
                _persisted_secret = stored
                return _persisted_secret
        path.parent.mkdir(parents=True, exist_ok=True)
        _persisted_secret = secrets.token_urlsafe(48)
        path.write_text(_persisted_secret, encoding="utf-8")
        logger.info("Generated random token-signing secret (persisted to %s).", path)
    except Exception as e:
        logger.error(
            "Could not generate/persist the token-signing secret (%s). "
            "Falling back to the default secret — set AUTH_SECRET to secure tokens.", e
        )
        _persisted_secret = DEFAULT_AUTH_SECRET
    return _persisted_secret


def hash_password(password: str) -> str:
    """Hash a password as 'pbkdf2_sha256$iterations$salt$digest'."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations, salt_hex, digest_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except Exception:
        return False


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(text: str) -> bytes:
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def create_access_token(payload: dict, expires_in_seconds: Optional[int] = None) -> str:
    """Sign a JWT-structure token: base64url(header).base64url(payload).base64url(sig)."""
    header = {"alg": "HS256", "typ": "JWT"}
    # Float precision (not int seconds): session revocation compares iat against
    # the sub-second password-change timestamp, so tokens minted just before a
    # rotation are rejected while the fresh token issued right after stays valid.
    now = time.time()
    ttl = expires_in_seconds if expires_in_seconds is not None else get_settings().auth_token_expiry_hours * 3600
    body = {**payload, "iat": now, "exp": now + ttl}
    signing_input = (
        f"{_b64url(json.dumps(header, separators=(',', ':')).encode())}"
        f".{_b64url(json.dumps(body, separators=(',', ':')).encode())}"
    )
    signature = hmac.new(_auth_secret().encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url(signature)}"


def verify_access_token(token: str) -> Optional[dict]:
    """Return the payload dict for a valid, unexpired token; None otherwise."""
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}"
        expected = hmac.new(
            _auth_secret().encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(expected, _b64url_decode(sig_b64)):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        if not isinstance(payload, dict) or payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None
