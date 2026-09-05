import re
import logging
from typing import Optional, Tuple
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

COORDS_PATTERN = re.compile(
    r"^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$"
)


def parse_coordinates(query: str) -> Optional[Tuple[float, float]]:
    match = COORDS_PATTERN.match(query.strip())
    if match:
        lat = float(match.group(1))
        lng = float(match.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng
    return None


async def geocode(query: str) -> dict:
    coords = parse_coordinates(query)
    if coords:
        return {
            "latitude": coords[0],
            "longitude": coords[1],
            "display_name": f"Location ({coords[0]:.4f}, {coords[1]:.4f})",
            "resolved": True,
            "source": "coordinates"
        }

    settings = get_settings()
    if not settings.has_geocoding:
        return _fallback_geocode(query)

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.opencagedata.com/geocode/v1/json",
                params={
                    "q": query,
                    "key": settings.geocoding_api_key,
                    "limit": 1,
                    "no_annotations": 1
                }
            )
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", [])
        if not results:
            return {"resolved": False, "error": "Could not resolve location. Try GPS coordinates (e.g. 31.42, 73.08)."}

        result = results[0]
        geometry = result["geometry"]
        return {
            "latitude": geometry["lat"],
            "longitude": geometry["lng"],
            "display_name": result.get("formatted", query),
            "resolved": True,
            "source": "opencage"
        }

    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        return _fallback_geocode(query)


def _fallback_geocode(query: str) -> dict:
    """Offline fallback using known Pakistani industrial centres."""
    known = {
        "faisalabad": (31.418, 73.079, "Faisalabad, Punjab, Pakistan"),
        "kasur": (31.12, 74.45, "Kasur, Punjab, Pakistan"),
        "sialkot": (32.49, 74.53, "Sialkot, Punjab, Pakistan"),
        "lahore": (31.52, 74.36, "Lahore, Punjab, Pakistan"),
        "karachi": (24.86, 67.01, "Karachi, Sindh, Pakistan"),
    }
    q_lower = query.lower()
    for key, (lat, lng, name) in known.items():
        if key in q_lower:
            return {
                "latitude": lat,
                "longitude": lng,
                "display_name": name,
                "resolved": True,
                "source": "local_cache"
            }

    return {
        "resolved": False,
        "error": "Could not resolve location. Please try GPS coordinates (e.g. 31.42, 73.08) or a known city name."
    }
