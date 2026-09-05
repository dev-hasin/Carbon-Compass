import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ScoreBar from '../components/ScoreBar';
import DiscrepancyTable from '../components/DiscrepancyTable';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { getFacility, getReportPdfUrl } from '../api';
import type { FacilityAnalysis, RiskBand } from '../types';
import { BAND_HEX } from '../utils/risk';
import { buildCitations, formatConfidence, formatDate } from '../utils/format';

/** Figma "OVERALL COMPLIANCE RISK" exposure wording per band. */
const EXPOSURE_LABELS: Record<RiskBand, string> = {
  low: 'LOW COMPLIANCE EXPOSURE',
  medium: 'MODERATE COMPLIANCE EXPOSURE',
  high: 'HIGH COMPLIANCE EXPOSURE',
  unknown: 'INSUFFICIENT DATA — NO SCORE ISSUED',
};

/**
 * Shareable forensic report (SRS §4.1 export/report screen, FR-15).
 * Prints to a light theme via the `print-plain` rules in index.css and links
 * to the server-generated PDF for the downloadable variant.
 */
export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [facility, setFacility] = useState<FacilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getFacility(id)
      .then(setFacility)
      .catch(() => setError('Report not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

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
          <h2 className="text-xl font-semibold text-slate-100 mb-2">Report not found</h2>
          <p className="text-sm text-slate-400 mb-5">
            The requested report could not be found. It may have been removed.
          </p>
          <Link to="/dashboard" className="px-5 py-2.5 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const shareLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const bandColor = BAND_HEX[facility.risk_band];
  const hasScore = facility.risk_score !== null;
  const citations = buildCitations(facility);
  const pdfUrl = getReportPdfUrl(facility.analysis_id);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 no-print">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/dashboard" className="hover:text-accent transition-colors">Dashboard</Link>
            <span>/</span>
            <Link to={`/facility/${facility.analysis_id}`} className="hover:text-accent transition-colors">
              Facilities
            </Link>
            <span>/</span>
            <span className="text-slate-300">Forensic Report</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={shareLink}
              className="px-4 py-2.5 rounded-lg border border-carbon-600 text-sm font-medium text-slate-300 hover:border-accent/50 hover:text-accent transition-colors"
            >
              {copied ? 'Link Copied!' : 'Share Link'}
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-lg border border-carbon-600 text-sm font-medium text-slate-300 hover:border-accent/50 hover:text-accent transition-colors"
            >
              Print
            </button>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft transition-colors shadow-glow"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Forensic PDF
            </a>
          </div>
        </div>

        {/* Report document */}
        <article className="rounded-xl border border-carbon-700 bg-carbon-850 p-6 sm:p-8 shadow-card print-plain">
          {/* Masthead */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-carbon-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-carbon-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="9" />
                  <polygon points="12,4 14,11 12,9 10,11" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold tracking-widest text-slate-100">
                  CARBON COMPASS FORENSIC REPORT
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">{facility.display_name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 sm:text-right">
              REPORT ID: <span className="font-mono text-slate-400">{facility.analysis_id}</span>
              <br />
              DATE GENERATED: <span className="text-slate-400">{formatDate(facility.analyzed_at)}</span>
            </p>
          </header>

          {/* Facility identity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-carbon-700 text-xs">
            <div>
              <p className="text-slate-500 font-semibold tracking-widest uppercase text-[10px] mb-1">Company</p>
              <p className="text-slate-300">{facility.company_name}</p>
            </div>
            <div>
              <p className="text-slate-500 font-semibold tracking-widest uppercase text-[10px] mb-1">Sector / Region</p>
              <p className="text-slate-300 capitalize">{facility.sector} · {facility.region}</p>
            </div>
            <div>
              <p className="text-slate-500 font-semibold tracking-widest uppercase text-[10px] mb-1">Coordinates</p>
              <p className="text-slate-300 font-mono">
                {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-semibold tracking-widest uppercase text-[10px] mb-1">Overall Confidence</p>
              <p className="text-slate-300">{formatConfidence(facility.overall_confidence)}</p>
            </div>
          </div>

          {/* Overall compliance risk + executive summary */}
          <section className="py-6 border-b border-carbon-700">
            <h2 className="text-[10px] font-semibold tracking-widest text-slate-500 mb-4">
              OVERALL COMPLIANCE RISK
            </h2>
            <div className="flex flex-col sm:flex-row gap-6">
              <div
                className="flex-shrink-0 rounded-xl border-2 bg-carbon-800 px-6 py-5 text-center sm:w-52"
                style={{ borderColor: bandColor }}
              >
                <p className="text-5xl font-bold text-slate-100 leading-none">
                  {hasScore ? Math.round(facility.risk_score as number) : '—'}
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: bandColor }}>/100</p>
                <p className="mt-3 text-[10px] font-bold tracking-widest" style={{ color: bandColor }}>
                  {EXPOSURE_LABELS[facility.risk_band]}
                </p>
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-100 mb-2">Executive Summary</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {hasScore
                    ? facility.rationale
                    : 'Confidence thresholds were not met across the available data layers, so no overall risk score was issued. No value was estimated to fill the gaps.'}
                </p>

                {facility.risk_signals.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {facility.risk_signals.map((signal, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: bandColor }}>
                          [!]
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          <span className="font-semibold" style={{ color: bandColor }}>Risk Signal:</span> {signal}
                        </p>
                      </div>
                    ))}
                    <p className="text-xs text-slate-500 leading-relaxed pt-2">
                      <span className="font-semibold text-slate-400">Suggested Follow-up:</span> review each risk
                      signal against internal records before a formal buyer audit or third-party certification.
                    </p>
                  </div>
                )}

                {facility.missing_sources.length > 0 && (
                  <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                    Excluded from score (Insufficient Data): {facility.missing_sources.join(', ')}.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Weighted risk score breakdown */}
          <section className="py-6 border-b border-carbon-700">
            <h2 className="text-sm font-semibold text-slate-100 mb-1">Weighted Risk Score Breakdown</h2>
            <p className="text-xs text-slate-500 mb-5">
              Transparent weighted model — Satellite 40%, Disclosure 40%, Shipment 20%. Weights re-normalise
              across available layers when one is Insufficient Data.
            </p>
            <div className="space-y-6">
              {facility.components.map((comp) => (
                <ScoreBar key={comp.name} component={comp} />
              ))}
            </div>
          </section>

          {/* Discrepancy audit */}
          <section className="py-6 border-b border-carbon-700">
            <h2 className="text-sm font-semibold text-slate-100 mb-1">Discrepancy Audit</h2>
            <p className="text-xs text-slate-500 mb-4">
              Self-disclosure vs. observable geo-evidence. Flagged rows are Risk Signals for review —
              not confirmed findings of non-compliance.
            </p>
            <DiscrepancyTable facility={facility} />
          </section>

          {/* Citations + disclaimer */}
          <section className="pt-6">
            <h2 className="text-sm font-semibold text-slate-100 mb-3">Data Source Citations</h2>
            <ol className="space-y-1 mb-5">
              {citations.map((citation, i) => (
                <li key={i} className="text-[11px] text-slate-500 break-words">
                  [{i + 1}] {citation}
                </li>
              ))}
            </ol>
            <DisclaimerBanner facility={facility} />
          </section>
        </article>

        {/* Post-report navigation */}
        <div className="mt-6 flex items-center justify-between no-print">
          <Link
            to={`/facility/${facility.analysis_id}`}
            className="text-sm text-slate-400 hover:text-accent transition-colors"
          >
            ← Back to Facility Detail
          </Link>
          <Link to="/dashboard" className="text-sm text-slate-400 hover:text-accent transition-colors">
            View all facilities →
          </Link>
        </div>
      </div>
    </div>
  );
}
