import json
import os
from pathlib import Path
from typing import Optional
from app.core.config import get_settings
from app.schemas.models import FacilityAnalysis


def _ensure_dirs():
    settings = get_settings()
    os.makedirs(settings.analyses_dir, exist_ok=True)
    os.makedirs(settings.satellite_dir, exist_ok=True)


def save_analysis(analysis: FacilityAnalysis) -> str:
    _ensure_dirs()
    settings = get_settings()
    path = Path(settings.analyses_dir) / f"{analysis.analysis_id}.json"
    data = analysis.model_dump(mode="json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    return analysis.analysis_id


def load_analysis(analysis_id: str) -> Optional[FacilityAnalysis]:
    settings = get_settings()
    path = Path(settings.analyses_dir) / f"{analysis_id}.json"
    if not path.exists():
        return None
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


def delete_analysis(analysis_id: str) -> bool:
    settings = get_settings()
    path = Path(settings.analyses_dir) / f"{analysis_id}.json"
    if path.exists():
        path.unlink()
        return True
    return False


def save_satellite_image(analysis_id: str, image_bytes: bytes, ext: str = "png") -> str:
    _ensure_dirs()
    settings = get_settings()
    filename = f"{analysis_id}.{ext}"
    path = Path(settings.satellite_dir) / filename
    with open(path, "wb") as f:
        f.write(image_bytes)
    return filename


def get_satellite_image_path(filename: str) -> Optional[str]:
    settings = get_settings()
    path = Path(settings.satellite_dir) / filename
    if path.exists():
        return str(path)
    return None
