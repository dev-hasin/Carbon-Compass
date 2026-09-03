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
  extracted_claims: string[];
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

/** Pipeline stages emitted by the streaming analysis endpoint. */
export type AnalysisStage =
  | 'geocoding_satellite'
  | 'disclosure_scanning'
  | 'ai_cross_analysis'
  | 'risk_scoring';

export interface StageEvent {
  type: 'stage';
  stage: AnalysisStage;
  status: 'running' | 'completed';
  detail: string;
  image_reference?: string | null;
  acquisition_date?: string | null;
}

export interface AnalysisCompleteEvent {
  type: 'complete';
  analysis: FacilityAnalysis;
}

export interface AnalysisErrorEvent {
  type: 'error';
  error: string;
}

export type AnalysisEvent = StageEvent | AnalysisCompleteEvent | AnalysisErrorEvent;
