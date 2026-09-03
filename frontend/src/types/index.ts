export type RiskBand = 'low' | 'medium' | 'high' | 'unknown';

export type ComponentStatus = 'ok' | 'insufficient_data' | 'error';

export interface ComponentResult {
  name: string;
  label: string;
  weight: number;
  status: ComponentStatus;
  score: number | null;
  confidence: number | null;
  rationale: string;
  observations: string[];
  risk_indicators: string[];
}

export interface FacilityAnalysis {
  analysis_id: string;
  company_name: string;
  display_name: string;
  latitude: number;
  longitude: number;
  sector: string;
  region: string;
  risk_score: number | null;
  risk_band: RiskBand;
  overall_confidence: number | null;
  overall_status: string;
  components: ComponentResult[];
  risk_signals: string[];
  rationale: string;
  image_reference: string | null;
  acquisition_date: string | null;
  disclosure_sources: string[];
  missing_sources: string[];
  analyzed_at: string;
}

export interface HeatmapPoint {
  analysis_id: string;
  display_name: string;
  latitude: number;
  longitude: number;
  risk_band: RiskBand;
  risk_score: number | null;
  sector: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  mock_mode: boolean;
  apis: Record<string, string>;
}

export interface AnalysisListResponse {
  facilities: FacilityAnalysis[];
  total: number;
}
