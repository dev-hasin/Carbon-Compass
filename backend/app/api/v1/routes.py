import re
import json
import logging
import os
from typing import AsyncIterator, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Security
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from datetime import datetime
import uuid

from app.core.config import get_settings
from app.core.security import create_access_token, verify_access_token
from app.schemas.models import (
    AnalyzeRequest, FacilityAnalysis, HealthResponse, AnalysisListResponse,
    HeatmapResponse, HeatmapPoint,
    AuthRegisterRequest, AuthLoginRequest, ChangePasswordRequest,
    AuthResponse, UserPublic, DeleteResponse,
)
from app.services import users as users_service
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
    storage_backend,
)
from app.services.report import generate_pdf_report
from app.services.demo import seed_demo_data

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1")

_bearer_scheme = HTTPBearer(auto_error=False)


# --- Auth dependencies (user/admin role separation) --------------------

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer_scheme),
) -> dict:
    """Require a valid bearer token; return the owning user record."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required. Please sign in.")
    payload = verify_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.")
    user = users_service.get_user_by_id(payload.get("sub", ""))
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    # Reject tokens issued before the last password change (old sessions die on
    # rotation). Both sides use sub-second float timestamps, so even a token minted
    # moments before the change is revoked while the fresh token stays valid.
    pwd_changed_at = float(user.get("pwd_changed_at") or 0)
    if payload.get("iat", 0) < pwd_changed_at:
        raise HTTPException(status_code=401, detail="Session expired after a password change. Please sign in again.")
    return users_service._public(user)


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require the admin role on top of authentication."""
    if user.get("role") != users_service.ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Admin privileges required for this action.")
    return user


# --- Auth endpoints -----------------------------------------------------

@router.post("/auth/register", response_model=AuthResponse)
async def register(request: AuthRegisterRequest):
    """Create a self-serve exporter account (always the 'user' role)."""
    try:
        user = users_service.create_user(
            email=request.email,
            password=request.password,
            company_name=request.company_name,
            role=users_service.ROLE_USER,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    settings = get_settings()
    token = create_access_token({"sub": user["user_id"], "role": user["role"], "email": user["email"]})
    return AuthResponse(
        access_token=token,
        expires_in=settings.auth_token_expiry_hours * 3600,
        user=UserPublic(**user),
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: AuthLoginRequest):
    email = request.email.strip().lower()
    remaining = users_service.lockout_remaining_seconds(email)
    if remaining > 0:
        minutes = max(1, remaining // 60 + 1)
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed sign-in attempts. This account is locked for ~{minutes} more minute(s).",
        )
    user = users_service.authenticate(request.email, request.password)
    if not user:
        locked_now = users_service.register_failed_login(email)
        if locked_now:
            raise HTTPException(
                status_code=429,
                detail="Too many failed sign-in attempts. Account locked for 15 minutes.",
            )
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    users_service.register_successful_login(email)
    user = users_service._public(user)
    settings = get_settings()
    token = create_access_token({"sub": user["user_id"], "role": user["role"], "email": user["email"]})
    return AuthResponse(
        access_token=token,
        expires_in=settings.auth_token_expiry_hours * 3600,
        user=UserPublic(**user),
    )


@router.post("/auth/change-password", response_model=AuthResponse)
async def change_password(request: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Rotate the signed-in account's password; issues a fresh token and
    invalidates every session created before the change."""
    try:
        updated = users_service.change_password(
            user_id=user["user_id"],
            current_password=request.current_password,
            new_password=request.new_password,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    settings = get_settings()
    token = create_access_token({"sub": updated["user_id"], "role": updated["role"], "email": updated["email"]})
    return AuthResponse(
        access_token=token,
        expires_in=settings.auth_token_expiry_hours * 3600,
        user=UserPublic(**updated),
    )


@router.get("/auth/me", response_model=UserPublic)
async def get_me(user: dict = Depends(get_current_user)):
    return UserPublic(**user)

# Pipeline stages surfaced to the UI (order matters)
STAGE_GEO_SAT = "geocoding_satellite"
STAGE_DISCLOSURE = "disclosure_scanning"
STAGE_AI = "ai_cross_analysis"
STAGE_SCORING = "risk_scoring"


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


async def run_analysis_pipeline(request: AnalyzeRequest) -> AsyncIterator[dict]:
    """
    Shared end-to-end analysis pipeline (SRS section 3, Modules A-C).

    Yields progress events consumed by both the plain JSON endpoint and the
    SSE streaming endpoint so the UI can render results progressively
    (SRS section 5.1):
      {"type": "stage", "stage": ..., "status": "running"|"completed", "detail": ...}
      {"type": "complete", "analysis": {...}}
      {"type": "error", "error": "..."}
    """
    analysis_id = f"cc-{_slugify(request.query)}-{uuid.uuid4().hex[:6]}"
    company_name = request.query
    sector = (request.sector or "mixed").lower()

    # --- Init event: analysis_id, query, and pending state for all stages ---
    yield {
        "type": "init",
        "analysis_id": analysis_id,
        "query": request.query,
        "stages": [
            {"stage": s, "status": "pending"}
            for s in (STAGE_GEO_SAT, STAGE_DISCLOSURE, STAGE_AI, STAGE_SCORING)
        ],
    }

    # --- Stage 1: Geocoding & satellite fetch -----------------------------
    yield {"type": "stage", "stage": STAGE_GEO_SAT, "status": "running",
           "detail": f"Resolving \"{request.query}\" to coordinates..."}

    geo = await geocode(request.query)
    if not geo.get("resolved"):
        yield {"type": "error",
               "error": geo.get("error", "Could not resolve location. Try GPS coordinates (e.g. 31.42, 73.08).")}
        return

    lat, lng = geo["latitude"], geo["longitude"]
    display_name = geo["display_name"]

    yield {"type": "stage", "stage": STAGE_GEO_SAT, "status": "running",
           "detail": f"Resolved to {lat:.4f}, {lng:.4f}. Fetching Sentinel-2 imagery..."}

    sat_result = await fetch_satellite_imagery(lat, lng, analysis_id)
    image_ref = sat_result.get("image_reference")
    acq_date = sat_result.get("acquisition_date")

    sat_note = (
        "Retrieved Sentinel-2 pass data."
        if sat_result.get("status") == "ok"
        else "Satellite imagery unavailable — component will be flagged Insufficient Data."
    )
    yield {"type": "stage", "stage": STAGE_GEO_SAT, "status": "completed",
           "detail": f"Resolved {display_name} to {lat:.4f}, {lng:.4f}. {sat_note}",
           "image_reference": image_ref, "acquisition_date": acq_date}

    # --- Stage 2: ESG disclosure scanning ----------------------------------
    yield {"type": "stage", "stage": STAGE_DISCLOSURE, "status": "running",
           "detail": "Scanning public sustainability disclosures and ESG news mentions..."}

    esg_result = await scrape_esg_disclosures(company_name, sector)
    source_count = len(esg_result.get("sources", []))
    if esg_result.get("status") == "insufficient_data":
        disc_note = "No public ESG disclosures found — component will be flagged Insufficient Data."
    else:
        disc_note = f"Parsed {source_count} public disclosure source(s)."

    yield {"type": "stage", "stage": STAGE_DISCLOSURE, "status": "completed",
           "detail": disc_note}

    # --- Stage 3: AI cross-analysis (Qwen vision + text + discrepancies) ---
    yield {"type": "stage", "stage": STAGE_AI, "status": "running",
           "detail": "Qwen is analysing satellite observations and extracting stated claims..."}

    vision_input = {}
    if sat_result.get("status") != "insufficient_data" and image_ref:
        img_path = get_satellite_image_path(image_ref)
        if img_path:
            with open(img_path, "rb") as f:
                img_bytes = f.read()
            # analyze_satellite_image falls back to a deterministic mock when
            # Qwen is not configured — mock mode keeps working without keys.
            vision_input = await analyze_satellite_image(img_bytes, company_name, sector)

    text_input = {}
    if esg_result.get("status") != "insufficient_data" and esg_result.get("extracted_text"):
        # Same graceful mock fallback applies to text analysis.
        text_input = await analyze_text_disclosures(
            esg_result["extracted_text"], company_name, sector
        )

    risk_signals = []
    if vision_input and text_input:
        risk_signals = await detect_discrepancies(vision_input, text_input, company_name)
    elif text_input.get("discrepancies"):
        risk_signals = text_input["discrepancies"]

    signal_note = (
        f"Identified {len(risk_signals)} risk signal(s) worth reviewing."
        if risk_signals
        else "No discrepancies flagged between claims and observable evidence."
    )
    yield {"type": "stage", "stage": STAGE_AI, "status": "completed",
           "detail": signal_note}

    # --- Stage 4: Risk score computation ------------------------------------
    weights = get_settings()
    yield {"type": "stage", "stage": STAGE_SCORING, "status": "running",
           "detail": (
               "Aggregating weighted risk attributions "
               f"(Satellite {weights.scoring_weight_satellite:.0%}, "
               f"Disclosure {weights.scoring_weight_disclosure:.0%}, "
               f"Shipment {weights.scoring_weight_shipping:.0%})..."
           )}

    ship_result = await get_shipping_activity(lat, lng, company_name)
    score_result = compute_risk_score(vision_input, text_input, ship_result)

    score_note = (
        f"Overall risk score {round(score_result['risk_score'])}/100 ({score_result['risk_band']} band)."
        if score_result["risk_score"] is not None
        else "Overall confidence below threshold — no score issued (Insufficient Data)."
    )
    yield {"type": "stage", "stage": STAGE_SCORING, "status": "completed",
           "detail": score_note}

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
    yield {"type": "complete", "analysis": json.loads(analysis.model_dump_json())}


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
            "storage": storage_backend(),
            "shipping": "mock_proxy",
        },
    )


@router.post("/facilities/analyze")
async def analyze_facility(request: AnalyzeRequest, user: dict = Depends(get_current_user)):
    """Blocking JSON variant — returns the completed analysis."""
    async for event in run_analysis_pipeline(request):
        if event["type"] == "complete":
            return event["analysis"]
        if event["type"] == "error":
            raise HTTPException(status_code=422, detail=event["error"])
    raise HTTPException(status_code=500, detail="Analysis pipeline ended without a result.")


@router.post("/facilities/analyze/stream")
async def analyze_facility_stream(request: AnalyzeRequest, user: dict = Depends(get_current_user)):
    """Server-Sent Events variant of /facilities/analyze for progressive rendering."""

    def sse(payload: dict) -> str:
        return f"data: {json.dumps(payload, default=str)}\n\n"

    async def event_stream():
        async for event in run_analysis_pipeline(request):
            yield sse(event)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/facilities", response_model=AnalysisListResponse)
async def get_facilities(sector: Optional[str] = None, user: dict = Depends(get_current_user)):
    all_analyses = list_analyses()
    if sector and sector.lower() != "all":
        all_analyses = [
            a for a in all_analyses if a.sector.lower() == sector.lower()
        ]
    return AnalysisListResponse(facilities=all_analyses, total=len(all_analyses))


@router.get("/facilities/{analysis_id}")
async def get_facility(analysis_id: str, user: dict = Depends(get_current_user)):
    analysis = load_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return analysis


@router.get("/facilities/{analysis_id}/report.pdf")
async def export_report(analysis_id: str, user: dict = Depends(get_current_user)):
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


@router.delete("/facilities/{analysis_id}", response_model=DeleteResponse)
async def delete_facility(analysis_id: str, admin: dict = Depends(require_admin)):
    """Admin-only: remove an analysis record and its cached satellite image."""
    analysis = load_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    settings = get_settings()
    try:
        os.remove(os.path.join(settings.analyses_dir, f"{analysis_id}.json"))
    except OSError:
        pass
    if analysis.image_reference:
        try:
            os.remove(os.path.join(settings.satellite_dir, analysis.image_reference))
        except OSError:
            pass
    logger.info(f"Admin {admin['email']} deleted analysis {analysis_id}")
    return DeleteResponse(status="ok", deleted_id=analysis_id)


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(user: dict = Depends(get_current_user)):
    """Lightweight map pins (coordinates + risk band) for the dashboard (SRS section 7)."""
    points = [
        HeatmapPoint(
            analysis_id=a.analysis_id,
            display_name=a.display_name,
            latitude=a.latitude,
            longitude=a.longitude,
            sector=a.sector,
            risk_band=a.risk_band,
            risk_score=a.risk_score,
        )
        for a in list_analyses()
    ]
    return HeatmapResponse(points=points, total=len(points))


@router.post("/admin/seed-demo")
async def seed_demo(admin: dict = Depends(require_admin)):
    seeded = seed_demo_data()
    return {"status": "ok", "seeded_count": len(seeded), "facility_ids": seeded}


@router.get("/satellite/image/{filename}")
async def get_satellite_image(filename: str):
    img_path = get_satellite_image_path(filename)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(img_path, media_type="image/png")
