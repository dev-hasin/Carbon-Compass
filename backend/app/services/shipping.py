import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def get_shipping_activity(
    latitude: float,
    longitude: float,
    company_name: str
) -> dict:
    settings = get_settings()
    # Shipping/port data requires specialized APIs (AIS, MarineTraffic, etc.)
    # For this prototype, we use a proximity-based mock
    return _mock_shipping_proxy(latitude, longitude, company_name)


def _mock_shipping_proxy(lat: float, lng: float, company_name: str) -> dict:
    # Pakistani port cities and their approximate coordinates
    ports = {
        "karachi_port": (24.86, 67.02, 85),
        "port_qasim": (24.79, 67.35, 78),
        "gwadar": (25.12, 62.33, 45),
    }

    min_dist = float("inf")
    nearest_intensity = 30

    for port_name, (plat, plng, intensity) in ports.items():
        dist = ((lat - plat) ** 2 + (lng - plng) ** 2) ** 0.5
        if dist < min_dist:
            min_dist = dist
            nearest_intensity = intensity

    # Scale intensity by distance (closer to port = higher activity)
    if min_dist < 0.5:
        activity_score = min(90, nearest_intensity + 20)
        confidence = 0.65
        rationale = "Facility in close proximity to major port. High operational-intensity proxy."
    elif min_dist < 2.0:
        activity_score = nearest_intensity
        confidence = 0.55
        rationale = "Facility within moderate distance of port activity. Medium operational-intensity proxy."
    else:
        activity_score = max(10, nearest_intensity - 30)
        confidence = 0.45
        rationale = "Facility distant from major ports. Low operational-intensity proxy based on regional shipping data."

    return {
        "status": "mock",
        "score": activity_score,
        "confidence": confidence,
        "rationale": rationale,
        "port_proximity_km": round(min_dist * 111, 1),
        "activity_level": "high" if activity_score > 60 else "medium" if activity_score > 30 else "low"
    }
