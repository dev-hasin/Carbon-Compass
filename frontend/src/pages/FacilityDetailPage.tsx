import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RiskBadge from '../components/RiskBadge';
import ScoreBar from '../components/ScoreBar';
import SatelliteImage from '../components/SatelliteImage';
import DiscrepancyTable from '../components/DiscrepancyTable';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { getFacility, downloadReportPdf } from '../api';
import type { FacilityAnalysis } from '../types';
import { componentOf, confidenceLabel } from '../utils/risk';
import { formatConfidence, formatDate } from '../utils/format';

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [facility, setFacility] = useState<FacilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getFacility(id)
      .then(setFacility)
      .catch(() => setError('Analysis not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <svg className="w-8 h-8 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-100 mb-2">Analysis not found</h2>
          <p className="text-sm text-slate-400 mb-5">
            The requested facility analysis could not be found.
          </p>
          <Link to="/dashboard" className="px-5 py-2.5 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const satellite = componentOf(facility, 'satellite');

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb + export action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/dashboard" className="hover:text-accent transition-colors">Dashboard</Link>
            <span>/</span>
            <span>Facilities</span>
            <span>/</span>
            <span className="text-slate-300 truncate max-w-[240px]">{facility.display_name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/report/${facility.analysis_id}`}
              className="px-4 py-2.5 rounded-lg border border-carbon-600 text-sm font-medium text-slate-300 hover:border-accent/50 hover:text-accent transition-colors btn-3d-ghost"
            >
              View Report
            </Link>
            <button
              type="button"
              onClick={() => downloadReportPdf(facility.analysis_id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft transition-colors shadow-glow btn-3d"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export PDF Report
            </button>
          </div>
        </div>

        {/* Hub summary */}
        <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-6 mb-6 animate-flip-in-x shadow-depth-1">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-50">{facility.display_name}</h1>
              <p className="text-sm text-accent mt-1 font-mono">{facility.analysis_id}</p>
              <p className="text-xs text-slate-500 mt-2 font-mono">
                LAT: {facility.latitude.toFixed(5)} | LON: {facility.longitude.toFixed(5)}
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-carbon-700 text-xs font-medium text-slate-300 capitalize">
                  {facility.sector} · {facility.region}
                </span>
                {facility.overall_status === 'insufficient_data' && (
                  <span className="px-2.5 py-1 rounded-md border border-slate-600 text-xs font-medium text-slate-400">
                    Insufficient Data
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <RiskBadge variant="panel" band={facility.risk_band} score={facility.risk_score} />
              <div className="text-sm space-y-1.5">
                <p className="text-slate-400">
                  Confidence:{' '}
                  <span className="text-risk-green-soft font-semibold">
                    {formatConfidence(facility.overall_confidence)} ({confidenceLabel(facility.overall_confidence)})
                  </span>
                </p>
                <p className="text-slate-400">
                  Last Sat Pass:{' '}
                  <span className="text-slate-200 font-medium">{formatDate(facility.acquisition_date)}</span>
                </p>
                <p className="text-slate-400">
                  Analysed:{' '}
                  <span className="text-slate-200 font-medium">{formatDate(facility.analyzed_at)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Satellite evidence + rationale */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <h2 className="text-sm font-semibold text-slate-100 mb-3 tracking-wide">
              Satellite Evidence — Observable Indicators
            </h2>
            <div className="group relative rounded-xl transition-transform duration-500 ease-out-expo hover:-translate-y-1">
              <SatelliteImage
                imageReference={facility.image_reference}
                acquisitionDate={facility.acquisition_date}
                observations={satellite?.observations ?? []}
                className="h-72 shadow-depth-2 group-hover:shadow-depth-3 transition-shadow duration-500"
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-2">
              Annotation boxes mark areas referenced by AI observations; positions are illustrative.
              Imagery shows observable features only — it does not measure emissions.
            </p>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            <h2 className="text-sm font-semibold text-slate-100 mb-3 tracking-wide">
              Compliance Risk Rationale
            </h2>
            <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-4 space-y-3 lg:h-[calc(18rem+1.5rem)] overflow-y-auto hover:border-accent/30 transition-colors duration-500">
              {facility.risk_signals.length > 0 ? (
                facility.risk_signals.map((signal, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-accent font-bold text-xs mt-0.5 flex-shrink-0">[!]</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{signal}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  No risk signals flagged between claims and observable evidence for this facility.
                </p>
              )}

              {facility.risk_signals.length > 0 && (
                <div className="pt-3 border-t border-carbon-700">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-semibold text-slate-400">Why this score?</span>{' '}
                    {facility.rationale}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Risk score attributions */}
        <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-6 mb-6 animate-fade-up" style={{ animationDelay: '360ms' }}>
          <h2 className="text-sm font-semibold text-slate-100 mb-1 tracking-wide">
            Risk Score Attributions
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Weighted model per SRS FR-9 — weights re-normalise across available components when a
            layer is Insufficient Data.
          </p>
          <div className="space-y-6">
            {facility.components.map((comp, i) => (
              <div key={comp.name} className="animate-fade-up" style={{ animationDelay: `${450 + i * 120}ms` }}>
                <ScoreBar component={comp} />
              </div>
            ))}
          </div>
        </div>

        {/* Discrepancy audit */}
        <div className="mb-6 animate-fade-up" style={{ animationDelay: '480ms' }}>
          <h2 className="text-sm font-semibold text-slate-100 mb-3 tracking-wide">
            Discrepancy Audit: Self-Disclosure vs. Geo-Evidence
          </h2>
          <DiscrepancyTable facility={facility} />
        </div>

        {/* Missing sources */}
        {facility.missing_sources.length > 0 && (
          <div className="mb-6 rounded-xl border border-carbon-700 bg-carbon-850 p-4 animate-fade-up" style={{ animationDelay: '560ms' }}>
            <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-2.5">
              INSUFFICIENT DATA — EXCLUDED FROM SCORE
            </p>
            <div className="flex flex-wrap gap-2">
              {facility.missing_sources.map((s, i) => (
                <span key={i} className="px-2.5 py-1 rounded-md border border-slate-600 bg-slate-700/20 text-xs text-slate-400">
                  {s}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2.5">
              These sources returned low-confidence or no data. The score was computed on available
              components only — nothing was estimated to fill the gap.
            </p>
          </div>
        )}

        {/* Disclaimer + citations */}
        <DisclaimerBanner facility={facility} />
      </div>
    </div>
  );
}
