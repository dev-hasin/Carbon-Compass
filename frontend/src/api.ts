import axios from 'axios';
import type {
  FacilityAnalysis,
  AnalysisListResponse,
  HealthResponse,
  HeatmapPoint,
} from '../types';

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
