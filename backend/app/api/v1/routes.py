import re
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Response
from datetime import datetime
import uuid

from app.core.config import get_settings
from app.schemas.models import (
    AnalyzeRequest, FacilityAnalysis, HealthResponse,
    AnalysisListResponse, HeatmapPoint, RiskBand
)
from app.services.geocoding import geocode
from app.services.satellite import fetch_satellite_imagery
from app.services.scraper import scrape_esg_disclosures
from app.services.qwen import (
    analyze_satellite_image,
    analyze_text_disclosures,
    detect_discrepancies,
)
from app.services.shipping import get_shipping_activity
from app.services.scoring import compute_risk_score
from app.services.storage import (
    save_analysis,
    load_analysis,
    list_analyses,
    get_satellite_image_path,
)
from app.services.report import generate_pdf_report
from app.services.demo import seed_demo_data

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1")


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:60]


def _infer_region(lat: float, lng: float) -> str:
    regions = [
        ("Faisalabad", 31.42, 73.08, 0.5),
        ("Kasur", 31.12, 74.45, 0.5),
        ("Sialkot", 32.49, 74.53, 0.5),
        ("Lahore", 31.52, 74.36, 0.5),
        ("Karachi", 24.86, 67.01, 1.0),
        ("Punjab", 31.0, 73.5, 2.0),
    ]
    for name, rlat, rlng, radius in regions:
        dist = ((lat - rlat) ** 2 + (lng - rlng) ** 2) ** 0.5
        if dist <= radius:
            return f"{name}, Pakistan"
    return "Pakistan"


@router.get("/health", response_model=HealthResponse)
async def health_check():
    settings = get_settings()
    mock_mode = not settings.has_qwen
    return HealthResponse(
        status="ok",
        version="1.0.0",
        mock_mode=mock_mode,
        apis={
            "geocoding": "live" if settings.has_geocoding else "mock",
            "sentinel_hub": "live" if settings.has_sentinel else "mock",
            "qwen": "live" if settings.has_qwen else "mock",
            "oss": "live" if settings.has_oss else "local_cache",
            "shipping": "mock_proxy",
        },
    )


@router.post("/facilities/analyze")
async def analyze_facility(request: AnalyzeRequest):
    analysis_id = f"cc-{_slugify(request.query)}-{uuid.uuid4().hex[:6]}"
    geo = await geocode(request.query)
    if not geo.get("resolved"):
        raise HTTPException(
            status_code=422,
            detail=geo.get(
                "error",
                "Could not resolve location. Try GPS coordinates (e.g. 31.42, 73.08).",
            ),
        )

    lat = geo["latitude"]
    lng = geo["longitude"]
    display_name = geo["display_name"]
    sector = (request.sector or "mixed").lower()
    company_name = request.query

    sat_result = await fetch_satellite_imagery(lat, lng, analysis_id)
    image_ref = sat_result.get("image_reference")
    acq_date = sat_result.get("acquisition_date")

    vision_input = {}
    if sat_result.get("status") != "insufficient_data":
        settings = get_settings()
        if settings.has_qwen and image_ref:
            img_path = get_satellite_image_path(image_ref)
            if img_path:
                with open(img_path, "rb") as f:
                    img_bytes = f.read()
                vision_input = await analyze_satellite_image(
                    img_bytes, company_name, sector
                )
        if not vision_input:
            vision_input = {
                "score": 50,
                "confidence": 0.7,
                "rationale": sat_result.get("rationale", ""),
                "observations": [],
                "risk_indicators": [],
            }

    esg_result = await scrape_esg_disclosures(company_name, sector)

    text_input = {}
    if esg_result.get("status") != "insufficient_data":
        settings = get_settings()
        if settings.has_qwen and esg_result.get("extracted_text"):
            text_input = await analyze_text_disclosures(
                esg_result["extracted_text"], company_name, sector
            )
        if not text_input:
            text_input = {
                "extracted_claims": [],
                "discrepancies": [],
                "score": 50,
                "confidence": 0.65,
                "rationale": esg_result.get("rationale", "Mock text analysis."),
            }

    ship_result = await get_shipping_activity(lat, lng, company_name)
    score_result = compute_risk_score(vision_input, text_input, ship_result)

    risk_signals = []
    if vision_input and text_input:
        risk_signals = await detect_discrepancies(
            vision_input, text_input, company_name
        )
    elif text_input.get("discrepancies"):
        risk_signals = text_input["discrepancies"]

    analysis = FacilityAnalysis(
        analysis_id=analysis_id,
        company_name=company_name,
        display_name=display_name,
        latitude=lat,
        longitude=lng,
        sector=sector,
        region=_infer_region(lat, lng),
        risk_score=score_result["risk_score"],
        risk_band=score_result["risk_band"],
        overall_confidence=score_result["overall_confidence"],
        overall_status=score_result["overall_status"],
        components=score_result["components"],
        risk_signals=risk_signals,
        rationale=score_result["rationale"],
        image_reference=image_ref,
        acquisition_date=acq_date,
        disclosure_sources=esg_result.get("sources", []),
        missing_sources=score_result.get("missing_sources", []),
        analyzed_at=datetime.utcnow(),
    )

    save_analysis(analysis)
    return analysis


@router.get("/facilities", response_model=AnalysisListResponse)
async def get_facilities(sector: Optional[str] = None):
    all_analyses = list_analyses()
    if sector and sector.lower() != "all":
        all_analyses = [
            a for a in all_analyses if a.sector.lower() == sector.lower()
        ]
    return AnalysisListResponse(facilities=all_analyses, total=len(all_analyses))


@router.get("/facilities/{analysis_id}")
async def get_facility(analysis_id: str):
    analysis = load_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return analysis


@router.get("/facilities/{analysis_id}/report.pdf")
async def export_report(analysis_id: str):
    analysis = load_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    pdf_bytes = generate_pdf_report(analysis)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{analysis_id}-report.pdf"'
        },
    )


@router.get("/heatmap")
async def get_heatmap(sector: Optional[str] = None):
    all_analyses = list_analyses()
    if sector and sector.lower() != "all":
        all_analyses = [
            a for a in all_analyses if a.sector.lower() == sector.lower()
        ]
    points = [
        HeatmapPoint(
            analysis_id=a.analysis_id,
            display_name=a.display_name,
            latitude=a.latitude,
            longitude=a.longitude,
            risk_band=a.risk_band,
            risk_score=a.risk_score,
            sector=a.sector,
        )
        for a in all_analyses
    ]
    return {"points": points, "total": len(points)}


@router.post("/admin/seed-demo")
async def seed_demo():
    seeded = seed_demo_data()
    return {"status": "ok", "seeded_count": len(seeded), "facility_ids": seeded}


@router.get("/satellite/image/{filename}")
async def get_satellite_image(filename: str):
    from fastapi.responses import FileResponse

    img_path = get_satellite_image_path(filename)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(img_path, media_type="image/png")
