"""
Storage layer: local filesystem first (fast demo cache), with write-through to
a durable cloud store (Supabase Storage preferred; Alibaba Cloud OSS as the
legacy fallback) per SRS section 4.3.

Every fetched satellite image and generated analysis is written locally AND
mirrored to the durable backend. Reads are local-first with a cloud fallback
so the demo can run from cache even if the cloud is unreachable.
"""
import json
import logging
import os
from pathlib import Path
from typing import Optional

import httpx

from app.core.config import get_settings
from app.schemas.models import FacilityAnalysis

logger = logging.getLogger(__name__)

ANALYSES_PREFIX = "analyses"
SATELLITE_PREFIX = "satellite"


def _ensure_dirs():
    settings = get_settings()
    os.makedirs(settings.analyses_dir, exist_ok=True)
    os.makedirs(settings.satellite_dir, exist_ok=True)


def _get_oss_bucket():
    """Return an oss2 Bucket when credentials are set and the SDK is available."""
    settings = get_settings()
    if not settings.has_oss:
        return None
    try:
        import oss2
    except ImportError:
        logger.warning("OSS credentials set but oss2 package is not installed; using local cache only.")
        return None
    try:
        auth = oss2.Auth(
            settings.alibaba_oss_access_key_id,
            settings.alibaba_oss_access_key_secret,
        )
        return oss2.Bucket(
            auth, settings.alibaba_oss_endpoint, settings.alibaba_oss_bucket_name
        )
    except Exception as e:
        logger.error(f"OSS bucket init error: {e}")
        return None


def oss_enabled() -> bool:
    """True when OSS storage is actually usable (credentials + SDK)."""
    return _get_oss_bucket() is not None


def _oss_put(key: str, data: bytes):
    """Best-effort upload — storage stays local-first if OSS fails."""
    bucket = _get_oss_bucket()
    if not bucket:
        return
    try:
        bucket.put_object(key, data)
    except Exception as e:
        logger.error(f"OSS put failed for {key}: {e}")


def _oss_get(key: str) -> Optional[bytes]:
    bucket = _get_oss_bucket()
    if not bucket:
        return None
    try:
        return bucket.get_object(key).read()
    except Exception:
        return None


# --- Supabase Storage (REST API, no SDK required) -------------------------


def supabase_enabled() -> bool:
    """True when Supabase Storage is configured (URL + anon key)."""
    return get_settings().has_supabase


def _supabase_headers(content_type: str, upsert: bool = False) -> dict:
    settings = get_settings()
    headers = {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {settings.supabase_anon_key}",
        "Content-Type": content_type,
    }
    if upsert:
        headers["x-upsert"] = "true"
    return headers


_client: Optional[httpx.Client] = None


def _supabase_client() -> httpx.Client:
    """Shared keep-alive client — the boot-time cache restore downloads every
    stored analysis, and a fresh TLS handshake per file would make startup
    (and Render's health-check window) unacceptably slow."""
    global _client
    if _client is None or _client.is_closed:
        settings = get_settings()
        _client = httpx.Client(
            base_url=settings.supabase_url.rstrip("/"),
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {settings.supabase_anon_key}",
            },
            timeout=30,
        )
    return _client


def _supabase_put(key: str, data: bytes, content_type: str):
    """Best-effort upload via the Storage REST API — local-first if it fails."""
    if not supabase_enabled():
        return
    try:
        settings = get_settings()
        resp = _supabase_client().post(
            f"/storage/v1/object/{settings.supabase_bucket}/{key}",
            content=data,
            headers=_supabase_headers(content_type, upsert=True),
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Supabase put failed for {key}: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        logger.error(f"Supabase put error for {key}: {e}")


def _supabase_get(key: str) -> Optional[bytes]:
    if not supabase_enabled():
        return None
    try:
        settings = get_settings()
        resp = _supabase_client().get(
            f"/storage/v1/object/{settings.supabase_bucket}/{key}",
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code == 200:
            return resp.content
        logger.warning(f"Supabase get miss for {key}: {resp.status_code} {resp.text[:200]}")
        return None
    except Exception as e:
        logger.error(f"Supabase get error for {key}: {e}")
        return None


# --- Durable backend dispatcher --------------------------------------------


def storage_backend() -> str:
    """Name of the active durable backend: supabase | oss | local_cache."""
    if supabase_enabled():
        return "supabase"
    if oss_enabled():
        return "oss"
    return "local_cache"


def _durable_put(key: str, data: bytes, content_type: str = "application/octet-stream"):
    """Mirror an object to the configured durable backend (best-effort)."""
    if supabase_enabled():
        _supabase_put(key, data, content_type)
    else:
        _oss_put(key, data)


def _durable_get(key: str) -> Optional[bytes]:
    """Fetch an object from the configured durable backend, if present."""
    if supabase_enabled():
        return _supabase_get(key)
    return _oss_get(key)


# --- Ephemeral-host recovery (Render free tier & friends) ------------------


def durable_enabled() -> bool:
    """True when any durable cloud backend (Supabase or OSS) is configured."""
    return supabase_enabled() or oss_enabled()


def durable_put_bytes(key: str, data: bytes, content_type: str = "application/octet-stream"):
    """Mirror an arbitrary state file (e.g. accounts) to the durable backend."""
    _durable_put(key, data, content_type)


def durable_get_bytes(key: str) -> Optional[bytes]:
    """Fetch an arbitrary state file from the durable backend."""
    return _durable_get(key)


def list_durable_keys(prefix: str, limit: int = 1000) -> list[str]:
    """List object names under a prefix (Supabase only; OSS returns []).

    Supabase returns names RELATIVE to the prefix (e.g. prefix "analyses/"
    yields "cc-demo-lahore.json", not "analyses/cc-demo-lahore.json").
    """
    if not supabase_enabled():
        return []
    settings = get_settings()
    try:
        resp = _supabase_client().post(
            f"/storage/v1/object/list/{settings.supabase_bucket}",
            json={"prefix": prefix, "limit": limit, "offset": 0},
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code != 200:
            logger.error(f"Supabase list failed for '{prefix}': {resp.status_code} {resp.text[:200]}")
            return []
        return [
            item["name"]
            for item in resp.json()
            if isinstance(item, dict) and item.get("name")
        ]
    except Exception as e:
        logger.error(f"Supabase list error for '{prefix}': {e}")
        return []


def restore_analyses_from_durable() -> int:
    """Rehydrate the local analysis cache from the durable backend.

    Ephemeral hosts (Render free tier) start every container with an empty
    data directory. This pulls each stored analysis JSON back into the local
    cache so the dashboard is populated right after boot. Satellite images
    are left to the existing per-file lazy fallback. Returns files restored.
    """
    _ensure_dirs()
    settings = get_settings()
    if list(Path(settings.analyses_dir).glob("*.json")):
        return 0  # local cache already warm
    restored = 0
    for name in list_durable_keys(f"{ANALYSES_PREFIX}/"):
        if not name.endswith(".json"):
            continue
        analysis_id = name[: -len(".json")]
        raw = _durable_get(f"{ANALYSES_PREFIX}/{name}")
        if not raw:
            continue
        try:
            FacilityAnalysis(**json.loads(raw))  # validate before caching
        except Exception as e:
            logger.warning(f"Skipping durable analysis {name}: {e}")
            continue
        (Path(settings.analyses_dir) / f"{analysis_id}.json").write_bytes(raw)
        restored += 1
    if restored:
        logger.info(f"Restored {restored} analyses from durable storage into the local cache.")
    return restored


def save_analysis(analysis: FacilityAnalysis) -> str:
    """Save analysis JSON locally + mirror to the durable cloud backend."""
    _ensure_dirs()
    settings = get_settings()

    # 1. Local write (always)
    path = Path(settings.analyses_dir) / f"{analysis.analysis_id}.json"
    data = analysis.model_dump_json(indent=2)
    with open(path, "w", encoding="utf-8") as f:
        f.write(data)
    _durable_put(f"{ANALYSES_PREFIX}/{analysis.analysis_id}.json", data.encode("utf-8"), "application/json")
    return analysis.analysis_id


def load_analysis(analysis_id: str) -> Optional[FacilityAnalysis]:
    """Load analysis from local cache; fall back to the durable cloud copy."""
    settings = get_settings()
    path = Path(settings.analyses_dir) / f"{analysis_id}.json"
    if not path.exists():
        # Fallback: fetch the durable copy if the local cache was cleared
        raw = _durable_get(f"{ANALYSES_PREFIX}/{analysis_id}.json")
        if not raw:
            return None
        return FacilityAnalysis(**json.loads(raw))
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return FacilityAnalysis(**data)


def list_analyses() -> list[FacilityAnalysis]:
    """List all analyses from local disk (fast, works offline)."""
    _ensure_dirs()
    settings = get_settings()
    results = []
    analyses_path = Path(settings.analyses_dir)
    for path in analyses_path.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            results.append(FacilityAnalysis(**data))
        except Exception:
            continue
    return results


def save_satellite_image(analysis_id: str, image_bytes: bytes, ext: str = "png") -> str:
    """Save satellite image locally + mirror to the durable cloud backend."""
    _ensure_dirs()
    settings = get_settings()
    filename = f"{analysis_id}.{ext}"
    path = Path(settings.satellite_dir) / filename

    # 1. Local write
    with open(path, "wb") as f:
        f.write(image_bytes)
    content_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
    _durable_put(f"{SATELLITE_PREFIX}/{filename}", image_bytes, content_type)
    return filename


def get_satellite_image_path(filename: str) -> Optional[str]:
    """Get local path of satellite image; download the durable copy if missing."""
    settings = get_settings()
    path = Path(settings.satellite_dir) / filename
    if not path.exists():
        # Fallback: download the durable copy into the local cache
        raw = _durable_get(f"{SATELLITE_PREFIX}/{filename}")
        if not raw:
            return None
        _ensure_dirs()
        with open(path, "wb") as f:
            f.write(raw)
    return str(path)
