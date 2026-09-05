"""
Storage layer: local filesystem first (fast demo cache), with write-through to
Alibaba Cloud OSS when configured (durable storage per SRS section 4.3).

Every fetched satellite image and generated analysis is written locally AND
uploaded to OSS. Reads are local-first with an OSS fallback so the demo can run
from cache even if OSS is unreachable.
"""
import json
import logging
import os
from pathlib import Path
from typing import Optional
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


def save_analysis(analysis: FacilityAnalysis) -> str:
    _ensure_dirs()
    settings = get_settings()
    path = Path(settings.analyses_dir) / f"{analysis.analysis_id}.json"
    data = analysis.model_dump_json(indent=2)
    with open(path, "w", encoding="utf-8") as f:
        f.write(data)
    _oss_put(f"{ANALYSES_PREFIX}/{analysis.analysis_id}.json", data.encode("utf-8"))
    return analysis.analysis_id


def load_analysis(analysis_id: str) -> Optional[FacilityAnalysis]:
    settings = get_settings()
    path = Path(settings.analyses_dir) / f"{analysis_id}.json"
    if not path.exists():
        # Fallback: fetch the durable copy from OSS if the local cache was cleared
        raw = _oss_get(f"{ANALYSES_PREFIX}/{analysis_id}.json")
        if not raw:
            return None
        return FacilityAnalysis(**json.loads(raw))
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return FacilityAnalysis(**data)


def list_analyses() -> list[FacilityAnalysis]:
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
    _ensure_dirs()
    settings = get_settings()
    filename = f"{analysis_id}.{ext}"
    path = Path(settings.satellite_dir) / filename
    with open(path, "wb") as f:
        f.write(image_bytes)
    _oss_put(f"{SATELLITE_PREFIX}/{filename}", image_bytes)
    return filename


def get_satellite_image_path(filename: str) -> Optional[str]:
    settings = get_settings()
    path = Path(settings.satellite_dir) / filename
    if not path.exists():
        # Fallback: download the durable copy from OSS into the local cache
        raw = _oss_get(f"{SATELLITE_PREFIX}/{filename}")
        if not raw:
            return None
        _ensure_dirs()
        with open(path, "wb") as f:
            f.write(raw)
    return str(path)
