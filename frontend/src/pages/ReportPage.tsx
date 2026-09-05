import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import RiskBadge from '../components/RiskBadge';
import { getFacility, getSatelliteImageUrl, getReportPdfUrl } from '../api';
import type { FacilityAnalysis } from '../types';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [facility, setFacility] = useState<FacilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getFacility(id).then(setFacility).catch(() => setFacility(null)).finally(() => setLoading(false));
  }, [id]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <svg className="w-8 h-8 text-teal-500 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">Report not found</h2>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">Back to Home</button>
        </div>
      </div>
    );
  }

  const pdfUrl = getReportPdfUrl(facility.analysis_id);
  const satelliteUrl = facility.image_reference ? getSatelliteImageUrl(facility.image_reference) : null;
  const bandLabel = facility.risk_band === 'unknown' ? 'Insufficient Data' : facility.risk_band.charAt(0).toUpperCase() + facility.risk_band.slice(1);
  const exposureLabel = facility.risk_band === 'high' ? 'High Exposure' : facility.risk_band === 'medium' ? 'Moderate Exposure' : facility.risk_band === 'low' ? 'Low Exposure' : 'Unscored';

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Action bar (hidden on print) */}
      <div className="print:hidden sticky top-16 z-40 bg-white/80 dark:bg-forest-950/80 backdrop-blur-md border-b border-stone-200 dark:border-emerald-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <button onClick={() => navigate(`/facility/${facility.analysis_id}`)} className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-teal-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
            Back to Detail
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyLink} className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-emerald-800 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-forest-900 transition-colors">
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-emerald-800 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-forest-900 transition-colors">
              Print
            </button>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors">
              Download PDF
            </a>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 print:mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12,2 14,10 12,8 10,10" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-sm font-bold text-stone-700 dark:text-stone-300 tracking-wide uppercase">Carbon Compass — Forensic Report</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50 print:text-black">{facility.display_name}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)} — {facility.region || 'Pakistan'} — {facility.sector} sector
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Analysis ID: {facility.analysis_id} — {new Date(facility.analyzed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Risk card */}
        <div className="p-6 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm mb-8 print:shadow-none print:border-stone-300">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Compliance Risk</p>
              <div className="flex items-center gap-3">
                {facility.risk_score !== null ? (
                  <p className={`text-5xl font-bold ${facility.risk_band === 'low' ? 'text-green-600' : facility.risk_band === 'medium' ? 'text-amber-600' : 'text-red-600'} print:text-black`}>
                    {facility.risk_score}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-stone-500">Insufficient Data</p>
                )}
                <div>
                  <RiskBadge band={facility.risk_band} score={facility.risk_score} size="lg" />
                  <p className="text-xs text-stone-500 mt-1">{exposureLabel} — Confidence: {facility.overall_confidence !== null ? `${(facility.overall_confidence * 100).toFixed(0)}%` : 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500 uppercase tracking-wider">Band</p>
              <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">{bandLabel}</p>
            </div>
          </div>
        </div>

        {/* Executive summary */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3 print:text-black">Executive Summary</h2>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{facility.rationale}</p>
        </section>

        {/* Risk signals */}
        {facility.risk_signals.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3 print:text-black">Risk Signals</h2>
            <div className="space-y-2">
              {facility.risk_signals.map((signal, i) => (
                <div key={i} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 print:bg-amber-50">
                  <p className="text-sm text-stone-700 dark:text-stone-300 print:text-stone-800"><span className="font-semibold text-amber-700 dark:text-amber-400">Risk Signal:</span> {signal}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Weighted breakdown */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3 print:text-black">Weighted Breakdown</h2>
          <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-emerald-800 print:border-stone-300">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-900/50 print:bg-stone-100">
                  <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Component</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Weight</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Score</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Confidence</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500 hidden sm:table-cell">Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-emerald-900/50">
                {facility.components.map((comp) => (
                  <tr key={comp.name} className="bg-white dark:bg-forest-900 print:bg-white">
                    <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100 print:text-stone-900">{comp.label}</td>
                    <td className="px-4 py-3 text-center text-stone-600 dark:text-stone-400 print:text-stone-700">{(comp.weight * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-center font-semibold text-stone-900 dark:text-stone-100 print:text-stone-900">
                      {comp.score !== null ? comp.score : <span className="text-stone-400">N/A</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-stone-600 dark:text-stone-400 print:text-stone-700">
                      {comp.confidence !== null ? `${(comp.confidence * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500 hidden sm:table-cell print:text-stone-700">{comp.rationale || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Satellite evidence */}
        {satelliteUrl && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3 print:text-black">Satellite Evidence</h2>
            <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-emerald-800 shadow-sm print:shadow-none">
              <img src={satelliteUrl} alt="Satellite imagery" className="w-full h-56 object-cover" />
            </div>
            {facility.acquisition_date && (
              <p className="text-xs text-stone-500 mt-2">Image as of {facility.acquisition_date} — Sentinel-2 (10–20m resolution). Observable evidence only.</p>
            )}
          </section>
        )}

        {/* Citations */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3 print:text-black">Data Sources & Citations</h2>
          <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 print:border-stone-300">
            <ol className="space-y-1.5 text-sm text-stone-600 dark:text-stone-400 list-decimal list-inside print:text-stone-700">
              <li>Sentinel Hub — Satellite imagery (Sentinel-2 L2A){facility.acquisition_date ? `, acquired ${facility.acquisition_date}` : ''}</li>
              {facility.disclosure_sources.map((src, i) => (
                <li key={i}>
                  {src.startsWith('http') ? <a href={src} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">{src}</a> : src}
                </li>
              ))}
              <li>Shipping Activity — Port proximity analysis (Karachi Port, Port Qasim)</li>
            </ol>
            {facility.missing_sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700">
                <p className="text-xs text-stone-500">Missing sources (excluded from score): {facility.missing_sources.join(', ')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/30 border border-stone-200 dark:border-stone-700 print:bg-stone-100 print:border-stone-300">
          <p className="text-xs text-stone-500 leading-relaxed print:text-stone-600">
            <strong>Legal Disclaimer:</strong> This report is a decision-support risk signal only. It is not a certified audit finding,
            regulatory attestation, or definitive emissions measurement. Observable satellite evidence does not directly measure
            CO&#8322; or methane. All findings should be verified by a qualified environmental auditor before acting on them.
          </p>
        </div>
      </div>
    </div>
  );
}
