from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RiskBand(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    UNKNOWN = "unknown"


class ComponentStatus(str, Enum):
    OK = "ok"
    INSUFFICIENT_DATA = "insufficient_data"
    ERROR = "error"


class AnalyzeRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Company name, address, or GPS coordinates"
    )
    sector: Optional[str] = Field(
        None,
        description="Optional sector hint: textile, leather, manufacturing, mixed"
    )


class ComponentResult(BaseModel):
    name: str
    label: str
    weight: float
    status: ComponentStatus = ComponentStatus.OK
    score: Optional[float] = None
    confidence: Optional[float] = None
    rationale: str = ""
    observations: List[str] = []
    risk_indicators: List[str] = []
    extracted_claims: List[str] = []


class FacilityAnalysis(BaseModel):
    analysis_id: str
    company_name: str
    display_name: str
    latitude: float
    longitude: float
    sector: str = "mixed"
    region: str = ""
    risk_score: Optional[float] = None
    risk_band: RiskBand = RiskBand.UNKNOWN
    overall_confidence: Optional[float] = None
    overall_status: str = "ok"
    components: List[ComponentResult] = []
    risk_signals: List[str] = []
    rationale: str = ""
    image_reference: Optional[str] = None
    acquisition_date: Optional[str] = None
    disclosure_sources: List[str] = []
    missing_sources: List[str] = []
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    mock_mode: bool = True
    apis: dict = {}


class AnalysisListResponse(BaseModel):
    facilities: List[FacilityAnalysis] = []
    total: int = 0


class HeatmapPoint(BaseModel):
    """Lightweight map pin for dashboard rendering (SRS section 7 /api/v1/heatmap)."""

    analysis_id: str
    display_name: str
    latitude: float
    longitude: float
    sector: str = "mixed"
    risk_band: RiskBand = RiskBand.UNKNOWN
    risk_score: Optional[float] = None


class HeatmapResponse(BaseModel):
    points: List[HeatmapPoint] = []
    total: int = 0


# --- Auth (user/admin role separation) --------------------------------

class AuthRegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=200)
    password: str = Field(..., min_length=6, max_length=200)
    company_name: str = Field("", max_length=200)


class AuthLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=200)
    password: str = Field(..., min_length=1, max_length=200)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=200)
    new_password: str = Field(..., min_length=6, max_length=200)


class UserPublic(BaseModel):
    user_id: str
    email: str
    company_name: str = ""
    role: str = "user"
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class DeleteResponse(BaseModel):
    status: str = "ok"
    deleted_id: str
