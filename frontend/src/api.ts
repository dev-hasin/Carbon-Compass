import axios from 'axios';
import type {
  FacilityAnalysis,
  AnalysisListResponse,
  HealthResponse,
  HeatmapResponse,
  AnalysisEvent,
  AuthResponse,
  User,
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const TOKEN_KEY = 'cc_auth_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable (private mode) — session stays memory-less */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the bearer token to every request when signed in.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Routes that stay browsable without an account. Anonymous API failures there
// must not bounce the visitor to /login — the landing page comes first.
const PUBLIC_PATHS = ['/', '/login', '/methodology'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

// On 401 with an active session (token attached), drop the token and bounce to
// the login page — unless the call itself was a login/register attempt, or the
// visitor is on a public page (landing, methodology) where 401s are expected
// for anonymous users and must not navigate anywhere.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    const hadSession = Boolean(getToken());
    const onPublicPage =
      typeof window !== 'undefined' && isPublicPath(window.location.pathname);
    if (
      status === 401 &&
      hadSession &&
      !onPublicPage &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register')
    ) {
      clearToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function authErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail: unknown = (error.response?.data as { detail?: unknown })?.detail;
    if (typeof detail === 'string') return detail;
    // FastAPI request-validation errors arrive as an array of issues.
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string } | undefined;
      return first?.msg ?? 'Invalid request.';
    }
    return error.message;
  }
  return 'Request failed.';
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data } = await api.post<AuthResponse>('/api/v1/auth/login', { email, password });
    setToken(data.access_token);
    return data;
  } catch (error) {
    throw new Error(authErrorMessage(error));
  }
}

export async function register(
  email: string,
  password: string,
  companyName: string
): Promise<AuthResponse> {
  try {
    const { data } = await api.post<AuthResponse>('/api/v1/auth/register', {
      email,
      password,
      company_name: companyName,
    });
    setToken(data.access_token);
    return data;
  } catch (error) {
    throw new Error(authErrorMessage(error));
  }
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/api/v1/auth/me');
  return data;
}

/** Rotate the signed-in account's password; stores the fresh token issued in return. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<AuthResponse> {
  try {
    const { data } = await api.post<AuthResponse>('/api/v1/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    setToken(data.access_token);
    return data;
  } catch (error) {
    throw new Error(authErrorMessage(error));
  }
}

export function logout(): void {
  clearToken();
}

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

/** Lightweight map pins (coordinates + risk band) for dashboard rendering (SRS section 7). */
export async function getHeatmap(): Promise<HeatmapResponse> {
  const { data } = await api.get('/api/v1/heatmap');
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

/** Admin-only: remove an analysis and its cached satellite image. */
export async function deleteFacility(analysisId: string): Promise<void> {
  await api.delete(`/api/v1/facilities/${analysisId}`);
}

export function getSatelliteImageUrl(filename: string): string {
  return `${BASE_URL}/api/v1/satellite/image/${filename}`;
}

/** Download the PDF through the authenticated client (token never hits a URL). */
export async function downloadReportPdf(analysisId: string): Promise<void> {
  const resp = await api.get(`/api/v1/facilities/${analysisId}/report.pdf`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(resp.data as Blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${analysisId}-report.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
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
