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


class HeatmapPoint(BaseModel):
    analysis_id: str
    display_name: str
    latitude: float
    longitude: float
    risk_band: RiskBand
    risk_score: Optional[float] = None
    sector: str = "mixed"


class AnalysisListResponse(BaseModel):
    facilities: List[FacilityAnalysis] = []
    total: int = 0


class ErrorResponse(BaseModel):
    detail: str
    code: str = "error"
