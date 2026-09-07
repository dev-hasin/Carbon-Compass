"""
User accounts with role separation ('user' vs 'admin'), persisted to a local
JSON file — same local-filesystem storage convention as analyses and satellite
images. A default admin is seeded on startup from settings.

Every write is mirrored to the durable cloud store (Supabase) so accounts
survive ephemeral hosts like Render's free tier, where the filesystem resets
on every restart; the file is pulled back on boot (restore_users_from_durable).
"""
import json
import logging
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.core.security import hash_password, verify_password

logger = logging.getLogger(__name__)

ROLE_USER = "user"
ROLE_ADMIN = "admin"

# --- Brute-force protection (in-memory, per account) --------------------

MAX_FAILED_LOGINS = 5
LOCKOUT_SECONDS = 15 * 60

_failed_logins: dict[str, dict] = {}  # email -> {"failures": int, "locked_until": float}


def _norm(email: str) -> str:
    return email.strip().lower()


def lockout_remaining_seconds(email: str) -> int:
    """Seconds left in an active lockout; 0 when the account is not locked.

    Only entries that actually had a lock (locked_until > 0) are cleared here —
    entries that are merely counting failures must survive so the counter can
    accumulate across requests.
    """
    entry = _failed_logins.get(_norm(email))
    if not entry:
        return 0
    locked_until = entry.get("locked_until", 0)
    if locked_until <= 0:
        return 0  # counting failures, not locked yet
    remaining = locked_until - time.time()
    if remaining <= 0:
        # An active lock has expired — clear the state and let logins resume.
        _failed_logins.pop(_norm(email), None)
        return 0
    return int(remaining)


def register_failed_login(email: str) -> bool:
    """Record a failed sign-in; returns True when the account just became locked."""
    key = _norm(email)
    entry = _failed_logins.setdefault(key, {"failures": 0, "locked_until": 0})
    entry["failures"] += 1
    if entry["failures"] >= MAX_FAILED_LOGINS:
        entry["locked_until"] = time.time() + LOCKOUT_SECONDS
        entry["failures"] = 0
        logger.warning(f"Login lockout triggered for {key} ({MAX_FAILED_LOGINS} failed attempts).")
        return True
    return False


def register_successful_login(email: str) -> None:
    _failed_logins.pop(_norm(email), None)


USERS_DURABLE_KEY = "state/users.json"


def _users_path() -> Path:
    return Path(get_settings().users_file)


def _load_all() -> list[dict]:
    path = _users_path()
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Failed to load users file: {e}")
        return []


def _save_all(users: list[dict]) -> None:
    path = _users_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)
    _mirror_to_durable(users)


def _mirror_to_durable(users: list[dict]) -> None:
    """Best-effort mirror of the accounts file so it survives ephemeral hosts."""
    try:
        from app.services.storage import durable_enabled, durable_put_bytes

        if durable_enabled():
            durable_put_bytes(
                USERS_DURABLE_KEY,
                json.dumps(users, indent=2).encode("utf-8"),
                "application/json",
            )
    except Exception as e:
        logger.error(f"Failed to mirror users file to durable storage: {e}")


def restore_users_from_durable() -> bool:
    """Pull the accounts file back from durable storage when the local copy is
    missing (fresh container on an ephemeral host). Must run before
    ensure_default_admin so an existing admin is not re-seeded over.
    """
    path = _users_path()
    if path.exists():
        return False
    try:
        from app.services.storage import durable_enabled, durable_get_bytes

        if not durable_enabled():
            return False
        raw = durable_get_bytes(USERS_DURABLE_KEY)
        if not raw:
            return False
        users = json.loads(raw)
        if not isinstance(users, list):
            logger.error("Durable users file is malformed; starting fresh.")
            return False
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
        logger.info(f"Restored {len(users)} user account(s) from durable storage.")
        return True
    except Exception as e:
        logger.error(f"Failed to restore users from durable storage: {e}")
        return False


def _public(user: dict) -> dict:
    """Strip the password hash before returning a user."""
    return {k: v for k, v in user.items() if k != "password_hash"}


def get_user_by_email(email: str) -> Optional[dict]:
    email_lower = email.strip().lower()
    for user in _load_all():
        if user["email"].lower() == email_lower:
            return user
    return None


def get_user_by_id(user_id: str) -> Optional[dict]:
    for user in _load_all():
        if user["user_id"] == user_id:
            return user
    return None


def create_user(email: str, password: str, company_name: str = "", role: str = ROLE_USER) -> dict:
    """Create a user; raises ValueError when the email is taken or input invalid.

    Admin accounts are never creatable through this path — the single admin is
    provisioned exclusively at startup via ensure_default_admin().
    """
    email = email.strip().lower()
    if not email or "@" not in email or "." not in email.split("@")[-1]:
        raise ValueError("Please provide a valid email address.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    if role == ROLE_ADMIN:
        raise ValueError("Admin accounts cannot be created through the API. Exactly one admin is provisioned at startup.")
    if role not in (ROLE_USER,):
        raise ValueError("Invalid role.")
    if get_user_by_email(email):
        raise ValueError("An account with this email already exists.")

    user = {
        "user_id": f"usr-{uuid.uuid4().hex[:12]}",
        "email": email,
        "company_name": company_name.strip(),
        "role": role,
        "password_hash": hash_password(password),
        "created_at": datetime.utcnow().isoformat(),
        # epoch seconds — tokens issued before this moment are rejected after a password change
        "pwd_changed_at": time.time(),
    }
    users = _load_all()
    users.append(user)
    _save_all(users)
    logger.info(f"Created {role} account: {email}")
    return _public(user)


def change_password(user_id: str, current_password: str, new_password: str) -> dict:
    """Change a user's password; invalidates every token issued beforehand."""
    users = _load_all()
    target = next((u for u in users if u["user_id"] == user_id), None)
    if not target:
        raise ValueError("Account not found.")
    if not verify_password(current_password, target.get("password_hash", "")):
        raise ValueError("Current password is incorrect.")
    if len(new_password) < 6:
        raise ValueError("New password must be at least 6 characters.")
    if verify_password(new_password, target.get("password_hash", "")):
        raise ValueError("New password must be different from the current password.")
    target["password_hash"] = hash_password(new_password)
    target["pwd_changed_at"] = time.time()
    _save_all(users)
    logger.info(f"Password changed for {target['email']}; older sessions invalidated.")
    return _public(target)


def authenticate(email: str, password: str) -> Optional[dict]:
    user = get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.get("password_hash", "")):
        return None
    return user


def ensure_default_admin() -> None:
    """Seed the single admin account on startup if none exists yet."""
    settings = get_settings()
    users = _load_all()
    if any(u.get("role") == ROLE_ADMIN for u in users):
        return
    try:
        admin = {
            "user_id": f"usr-{uuid.uuid4().hex[:12]}",
            "email": settings.admin_email.strip().lower(),
            "company_name": "Carbon Compass",
            "role": ROLE_ADMIN,
            "password_hash": hash_password(settings.admin_password),
            "created_at": datetime.utcnow().isoformat(),
            "pwd_changed_at": time.time(),
        }
        users.append(admin)
        _save_all(users)
        logger.info(f"Seeded default admin account: {admin['email']}")
        if settings.admin_password == "admin123":
            logger.warning(
                "SECURITY: the admin account is using the default password. "
                "Sign in and change it immediately (user menu -> Change Password), "
                "or set ADMIN_PASSWORD in .env before first startup."
            )
    except Exception as e:
        logger.error(f"Failed to seed default admin: {e}")
