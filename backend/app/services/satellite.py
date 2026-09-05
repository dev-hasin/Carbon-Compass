import logging
import io
from datetime import datetime
from typing import Optional
import httpx
from app.core.config import get_settings
from app.services.storage import save_satellite_image

logger = logging.getLogger(__name__)


async def fetch_satellite_imagery(
    latitude: float,
    longitude: float,
    analysis_id: str
) -> dict:
    settings = get_settings()
    if not settings.has_sentinel:
        return _mock_satellite(analysis_id)

    try:
        token = await _get_sentinel_token(settings)
        if not token:
            return _mock_satellite(analysis_id)

        image_bytes = await _fetch_sentinel_image(
            token, latitude, longitude
        )
        if not image_bytes:
            return {
                "status": "insufficient_data",
                "rationale": "Satellite imagery unavailable for this location.",
                "image_reference": None,
                "acquisition_date": None
            }

        filename = save_satellite_image(analysis_id, image_bytes)
        return {
            "status": "ok",
            "rationale": "Sentinel-2 imagery acquired successfully.",
            "image_reference": filename,
            "acquisition_date": datetime.utcnow().strftime("%Y-%m-%d")
        }

    except Exception as e:
        logger.error(f"Satellite fetch error: {e}")
        return _mock_satellite(analysis_id)


async def _get_sentinel_token(settings) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://services.sentinel-hub.com/oauth/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.sentinel_hub_client_id,
                    "client_secret": settings.sentinel_hub_client_secret,
                },
            )
            resp.raise_for_status()
            return resp.json().get("access_token")
    except Exception as e:
        logger.error(f"Sentinel auth error: {e}")
        return None


async def _fetch_sentinel_image(
    token: str, lat: float, lng: float
) -> Optional[bytes]:
    try:
        bbox = _bbox_from_coords(lat, lng, delta=0.01)
        evalscript = """
        //VERSION=3
        function setup() {
            return { input: ["B04", "B03", "B02"], output: { bands: 3 } };
        }
        function evaluatePixel(sample) {
            return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
        }
        """
        payload = {
            "input": {
                "bounds": {
                    "bbox": bbox,
                    "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}
                },
                "data": [{
                    "type": "sentinel-2-l2a",
                    "dataFilter": {"timeRange": _recent_time_range()},
                }]
            },
            "output": {
                "width": 512,
                "height": 512,
                "responses": [{"identifier": "default", "format": {"type": "image/png"}}]
            },
            "evalscript": evalscript,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://services.sentinel-hub.com/api/v1/process",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code == 200 and len(resp.content) > 100:
                return resp.content
    except Exception as e:
        logger.error(f"Sentinel process error: {e}")
    return None


def _bbox_from_coords(lat: float, lng: float, delta: float = 0.01):
    return [lng - delta, lat - delta, lng + delta, lat + delta]


def _recent_time_range():
    now = datetime.utcnow()
    from_date = now.replace(day=1).strftime("%Y-%m-%d")
    to_date = now.strftime("%Y-%m-%d")
    return {"from": from_date, "to": to_date}


def _mock_satellite(analysis_id: str) -> dict:
    image_bytes = _generate_mock_satellite_image()
    filename = save_satellite_image(analysis_id, image_bytes)
    return {
        "status": "mock",
        "rationale": "Mock satellite imagery (Sentinel Hub not configured). Observable proxies simulated.",
        "image_reference": filename,
        "acquisition_date": datetime.utcnow().strftime("%Y-%m-%d")
    }


def _generate_mock_satellite_image() -> bytes:
    try:
        from PIL import Image, ImageDraw
        import random
        img = Image.new("RGB", (512, 512), (34, 85, 52))
        draw = ImageDraw.Draw(img)
        random.seed(42)
        for _ in range(80):
            x = random.randint(0, 480)
            y = random.randint(0, 480)
            w = random.randint(10, 50)
            h = random.randint(10, 50)
            color = random.choice([
                (90, 120, 70), (60, 90, 50), (100, 130, 80),
                (140, 130, 100), (80, 80, 60), (45, 70, 45)
            ])
            draw.rectangle([x, y, x + w, y + h], fill=color)
        for _ in range(5):
            x = random.randint(0, 480)
            y = random.randint(0, 480)
            w = random.randint(20, 60)
            h = random.randint(20, 60)
            draw.rectangle([x, y, x + w, y + h], fill=(160, 150, 130))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except ImportError:
        return _minimal_png()


def _minimal_png() -> bytes:
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = b'\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
    idat = b'\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N'
    iend = b'\x00\x00\x00\x00IEND\xaeB`\x82'
    return header + ihdr + idat + iend
