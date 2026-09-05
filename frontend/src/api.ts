import axios from 'axios';
import type {
  FacilityAnalysis,
  AnalysisListResponse,
  HealthResponse,
  HeatmapPoint,
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get('/api/v1/health');
  return data;
}

export async function analyzeFacility(
  query: string,
  sector?: string
): Promise<FacilityAnalysis> {
  const { data } = await api.post('/api/v1/facilities/analyze', {
    query,
    sector: sector || null,
  });
  return data;
}

export async function getFacilities(
  sector?: string
): Promise<AnalysisListResponse> {
  const params = sector && sector !== 'all' ? { sector } : {};
  const { data } = await api.get('/api/v1/facilities', { params });
  return data;
}

export async function getFacility(id: string): Promise<FacilityAnalysis> {
  const { data } = await api.get(`/api/v1/facilities/${id}`);
  return data;
}

export async function getHeatmap(
  sector?: string
): Promise<{ points: HeatmapPoint[]; total: number }> {
  const params = sector && sector !== 'all' ? { sector } : {};
  const { data } = await api.get('/api/v1/heatmap', { params });
  return data;
}

export async function seedDemo(): Promise<{
  status: string;
  seeded_count: number;
  facility_ids: string[];
}> {
  const { data } = await api.post('/api/v1/admin/seed-demo');
  return data;
}

export function getSatelliteImageUrl(filename: string): string {
  return `${BASE_URL}/api/v1/satellite/image/${filename}`;
}

export function getReportPdfUrl(analysisId: string): string {
  return `${BASE_URL}/api/v1/facilities/${analysisId}/report.pdf`;
}

/* ── SSE stream reader ─────────────────────────────────────────────── */

export interface SSEStageEvent {
  stage: string;
  status: 'running' | 'completed' | 'error' | 'insufficient_data';
  [key: string]: unknown;
}

export interface SSECompleteEvent {
  analysis_id: string;
  risk_score: number | null;
  risk_band: string;
  overall_status: string;
}

export interface SSEInitEvent {
  analysis_id: string;
  query: string;
  stages: Record<string, string>;
}

export type SSEEvent =
  | { type: 'init'; data: SSEInitEvent }
  | { type: 'stage'; data: SSEStageEvent }
  | { type: 'complete'; data: SSECompleteEvent }
  | { type: 'error'; data: { message: string } };

export async function analyzeFacilityStream(
  query: string,
  sector: string | undefined,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const url = `${BASE_URL}/api/v1/facilities/analyze/stream`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, sector: sector || null }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Stream request failed' }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ') && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6));
          onEvent({ type: currentEvent, data } as SSEEvent);
        } catch {
          // skip malformed JSON
        }
        currentEvent = '';
      }
    }
  }
}
