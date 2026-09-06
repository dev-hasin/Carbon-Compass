import axios from 'axios';
import type {
  FacilityAnalysis,
  AnalysisListResponse,
  HealthResponse,
  AnalysisEvent,
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get('/api/v1/health');
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

/**
 * Stream the analysis pipeline over Server-Sent Events so the UI can render
 * each stage progressively as it completes (SRS section 5.1).
 *
 * EventSource only supports GET, so this reads the SSE stream from a
 * fetch POST response and parses `data: ...` frames manually.
 */
export async function streamAnalysis(
  query: string,
  sector: string | null,
  onEvent: (event: AnalysisEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const resp = await fetch(`${BASE_URL}/api/v1/facilities/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, sector: sector || null }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    let detail = `Analysis request failed (${resp.status}).`;
    try {
      const payload = await resp.json();
      if (payload?.detail) detail = payload.detail;
    } catch {
      /* keep default message */
    }
    onEvent({ type: 'error', error: detail });
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const dataLine = frame
        .split('\n')
        .find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      try {
        onEvent(JSON.parse(dataLine.slice(6)) as AnalysisEvent);
      } catch {
        /* skip malformed frame */
      }
    }
  }
}
