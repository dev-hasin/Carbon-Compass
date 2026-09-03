import type { FacilityAnalysis } from '../types';
import { componentOf } from './risk';

/** "3 minutes ago" / "4 hours ago" / "yesterday" style relative time. */
export function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'N/A';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatConfidence(confidence: number | null): string {
  if (confidence === null) return 'N/A';
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Build the visible data-source citation list for a facility (SRS FR-18:
 * every score is accompanied by data-source citations).
 */
export function buildCitations(facility: FacilityAnalysis): string[] {
  const citations: string[] = [];

  const satellite = componentOf(facility, 'satellite');
  if (satellite && satellite.status === 'ok' && facility.acquisition_date) {
    citations.push(
      `Sentinel-2 L2A satellite imagery (Sentinel Hub) — acquired ${facility.acquisition_date}`
    );
  } else {
    citations.push('Satellite imagery — unavailable for this analysis');
  }

  facility.disclosure_sources.forEach((src) => {
    citations.push(`Public disclosure — ${src}`);
  });

  const shipping = componentOf(facility, 'shipping');
  if (shipping && shipping.status === 'ok') {
    citations.push('Port activity proxy — port proximity analysis (public shipping data)');
  }

  citations.push(
    `AI reasoning — Qwen via Alibaba Cloud Model Studio, analysed ${formatDate(facility.analyzed_at)}`
  );

  return citations;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Export the monitored-facility registry as a CSV download. */
export function downloadFacilitiesCsv(facilities: FacilityAnalysis[]): void {
  const header = [
    'Facility', 'Company', 'Region', 'Sector', 'Latitude', 'Longitude',
    'Risk Score', 'Risk Band', 'Confidence', 'Status', 'Last Analysed',
  ];
  const rows = facilities.map((f) => [
    f.display_name,
    f.company_name,
    f.region,
    f.sector,
    f.latitude.toFixed(5),
    f.longitude.toFixed(5),
    f.risk_score !== null ? String(f.risk_score) : 'Insufficient Data',
    f.risk_band,
    formatConfidence(f.overall_confidence),
    f.overall_status,
    new Date(f.analyzed_at).toISOString(),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `carbon-compass-facilities-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
