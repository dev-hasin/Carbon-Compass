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

/** Lightweight map pin for dashboard rendering (SRS /api/v1/heatmap). */
export interface HeatmapPoint {
  analysis_id: string;
  display_name: string;
  latitude: number;
  longitude: number;
  sector: string;
  risk_band: RiskBand;
  risk_score: number | null;
}

export interface HeatmapResponse {
  points: HeatmapPoint[];
  total: number;
}

/** Pipeline stages emitted by the streaming analysis endpoint. */
export type AnalysisStage =
  | 'geocoding_satellite'
  | 'disclosure_scanning'
  | 'ai_cross_analysis'
  | 'risk_scoring';

/** Initial SSE event: analysis_id, query, and pending state for all stages (SRS 7.1). */
export interface AnalysisInitEvent {
  type: 'init';
  analysis_id: string;
  query: string;
  stages: { stage: AnalysisStage; status: 'pending' }[];
}

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

export type AnalysisEvent =
  | AnalysisInitEvent
  | StageEvent
  | AnalysisCompleteEvent
  | AnalysisErrorEvent;

// --- Auth (user/admin role separation) --------------------------------

export type UserRole = 'user' | 'admin';

export interface User {
  user_id: string;
  email: string;
  company_name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}
