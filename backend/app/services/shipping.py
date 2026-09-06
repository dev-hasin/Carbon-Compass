import logging

logger = logging.getLogger(__name__)


async def get_shipping_activity(
    latitude: float,
    longitude: float,
    company_name: str
) -> dict:
    """
    Estimate shipping/trade activity using port-proximity analysis.

    This uses distance to major Pakistani ports as a proxy for trade
    intensity — a legitimate signal for export-sector facilities.
    """
    return _port_proximity_analysis(latitude, longitude, company_name)


def _port_proximity_analysis(lat: float, lng: float, company_name: str) -> dict:
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
        rationale = "Facility in close proximity to major port. High trade-activity indicator."
    elif min_dist < 2.0:
        activity_score = nearest_intensity
        confidence = 0.55
        rationale = "Facility within moderate distance of port activity. Medium trade-activity indicator."
    else:
        activity_score = max(10, nearest_intensity - 30)
        confidence = 0.45
        rationale = "Facility distant from major ports. Low trade-activity indicator based on geographic analysis."

    return {
        "status": "port_proximity",
        "score": activity_score,
        "confidence": confidence,
        "rationale": rationale,
        "port_proximity_km": round(min_dist * 111, 1),
        "activity_level": "high" if activity_score > 60 else "medium" if activity_score > 30 else "low"
    }
