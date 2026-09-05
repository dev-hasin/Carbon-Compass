"""
Storage service — local-first with Supabase Storage mirror.

Pattern:
  WRITE: save to local disk → mirror to Supabase (best-effort, never blocks on failure)
  READ:  check local cache first → if missing, try downloading from Supabase
  LIST:  always reads from local disk (fast, works offline)

Supabase bucket layout:
  analyses/<analysis_id>.json
  satellite/<analysis_id>.png
  reports/<analysis_id>.pdf
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.schemas.models import FacilityAnalysis

logger = logging.getLogger(__name__)

# ── Supabase client (lazy singleton) ──────────────────────────────────

_supabase_client = None


def _get_supabase():
    """Return the Supabase client, creating it once. Returns None if not configured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    settings = get_settings()
    if not settings.has_supabase:
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(settings.supabase_url, settings.supabase_anon_key)
        logger.info("Supabase Storage connected: %s (bucket: %s)", settings.supabase_url, settings.supabase_bucket)
        return _supabase_client
    except Exception as exc:
        logger.warning("Supabase client init failed: %s — falling back to local storage", exc)
        return None


def _bucket():
    """Return the storage bucket helper, or None."""
    sb = _get_supabase()
    if sb is None:
        return None
    settings = get_settings()
    return sb.storage.from_(settings.supabase_bucket)


# ── Local filesystem helpers ──────────────────────────────────────────

def _ensure_dirs():
    settings = get_settings()
    os.makedirs(settings.analyses_dir, exist_ok=True)
    os.makedirs(settings.satellite_dir, exist_ok=True)


# ── Analysis CRUD ─────────────────────────────────────────────────────

def save_analysis(analysis: FacilityAnalysis) -> str:
    """Save analysis JSON locally + mirror to Supabase."""
    _ensure_dirs()
    settings = get_settings()

    # 1. Local write (always)
    path = Path(settings.analyses_dir) / f"{analysis.analysis_id}.json"
    data = analysis.model_dump(mode="json")
    data_bytes = json.dumps(data, indent=2, default=str).encode("utf-8")
    with open(path, "w", encoding="utf-8") as f:
        f.write(data_bytes.decode("utf-8"))

    # 2. Supabase mirror (best-effort)
    bucket = _bucket()
    if bucket:
        try:
            remote_path = f"analyses/{analysis.analysis_id}.json"
            bucket.upload(remote_path, data_bytes, {
                "content-type": "application/json",
                "upsert": "true",
            })
            logger.debug("Supabase: uploaded %s", remote_path)
        except Exception as exc:
            logger.warning("Supabase: failed to upload analysis %s: %s", analysis.analysis_id, exc)

    return analysis.analysis_id


def load_analysis(analysis_id: str) -> Optional[FacilityAnalysis]:
    """Load analysis from local cache; fall back to Supabase download."""
    settings = get_settings()
    path = Path(settings.analyses_dir) / f"{analysis_id}.json"

    # 1. Try local
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return FacilityAnalysis(**data)

    # 2. Try Supabase download
    bucket = _bucket()
    if bucket:
        try:
            remote_path = f"analyses/{analysis_id}.json"
            response = bucket.download(remote_path)
            if response:
                data = json.loads(response)
                # Cache locally for next read
                _ensure_dirs()
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, default=str)
                logger.info("Supabase: downloaded and cached %s", remote_path)
                return FacilityAnalysis(**data)
        except Exception as exc:
            logger.debug("Supabase: analysis %s not found in cloud: %s", analysis_id, exc)

    return None


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


def delete_analysis(analysis_id: str) -> bool:
    """Delete from local disk + Supabase."""
    settings = get_settings()
    path = Path(settings.analyses_dir) / f"{analysis_id}.json"
    deleted = False

    if path.exists():
        path.unlink()
        deleted = True

    # Also remove from Supabase
    bucket = _bucket()
    if bucket:
        try:
            bucket.remove([f"analyses/{analysis_id}.json"])
        except Exception as exc:
            logger.debug("Supabase: could not delete analysis %s: %s", analysis_id, exc)

    return deleted


# ── Satellite images ──────────────────────────────────────────────────

def save_satellite_image(analysis_id: str, image_bytes: bytes, ext: str = "png") -> str:
    """Save satellite image locally + mirror to Supabase."""
    _ensure_dirs()
    settings = get_settings()
    filename = f"{analysis_id}.{ext}"
    path = Path(settings.satellite_dir) / filename

    # 1. Local write
    with open(path, "wb") as f:
        f.write(image_bytes)

    # 2. Supabase mirror
    bucket = _bucket()
    if bucket:
        try:
            remote_path = f"satellite/{filename}"
            bucket.upload(remote_path, image_bytes, {
                "content-type": "image/png",
                "upsert": "true",
            })
            logger.debug("Supabase: uploaded %s", remote_path)
        except Exception as exc:
            logger.warning("Supabase: failed to upload satellite %s: %s", filename, exc)

    return filename


def get_satellite_image_path(filename: str) -> Optional[str]:
    """Get local path of satellite image; download from Supabase if missing."""
    settings = get_settings()
    path = Path(settings.satellite_dir) / filename

    # 1. Local cache hit
    if path.exists():
        return str(path)

    # 2. Try Supabase download
    bucket = _bucket()
    if bucket:
        try:
            remote_path = f"satellite/{filename}"
            response = bucket.download(remote_path)
            if response:
                _ensure_dirs()
                with open(path, "wb") as f:
                    f.write(response)
                logger.info("Supabase: downloaded and cached satellite %s", remote_path)
                return str(path)
        except Exception as exc:
            logger.debug("Supabase: satellite %s not found in cloud: %s", filename, exc)

    return None


# ── PDF reports ───────────────────────────────────────────────────────

def save_report(analysis_id: str, pdf_bytes: bytes) -> Optional[str]:
    """Upload a generated PDF to Supabase Storage. Returns the public URL or None."""
    bucket = _bucket()
    if not bucket:
        return None

    try:
        remote_path = f"reports/{analysis_id}.pdf"
        bucket.upload(remote_path, pdf_bytes, {
            "content-type": "application/pdf",
            "upsert": "true",
        })
        # Get public URL
        url_data = bucket.get_public_url(remote_path)
        logger.debug("Supabase: uploaded report %s → %s", remote_path, url_data)
        return url_data
    except Exception as exc:
        logger.warning("Supabase: failed to upload report %s: %s", analysis_id, exc)
        return None


def get_report_url(analysis_id: str) -> Optional[str]:
    """Get the public Supabase URL for a cached PDF report, or None."""
    bucket = _bucket()
    if not bucket:
        return None

    try:
        remote_path = f"reports/{analysis_id}.pdf"
        url_data = bucket.get_public_url(remote_path)
        return url_data
    except Exception:
        return None
