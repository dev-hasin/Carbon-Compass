import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RiskBadge from '../components/RiskBadge';
import { getFacility, getSatelliteImageUrl, getReportPdfUrl } from '../api';
import type { FacilityAnalysis, ComponentResult } from '../types';

function ComponentCard({ component: comp }: { component: ComponentResult }) {
  const isOk = comp.status === 'ok' && comp.score !== null;
  const scoreColor = !isOk ? 'text-stone-400'
    : comp.score < 30 ? 'text-green-600 dark:text-green-400'
    : comp.score <= 60 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="p-5 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{comp.label}</h3>
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Weight: {(comp.weight * 100).toFixed(0)}%</span>
      </div>
      {isOk ? (
        <>
          <p className={`text-3xl font-bold ${scoreColor}`}>{comp.score}</p>
          {comp.confidence !== null && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                <span>Confidence</span><span>{(comp.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${comp.confidence * 100}%` }} />
              </div>
            </div>
          )}
        </>
      ) : (
        <span className="px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-500">Insufficient Data</span>
      )}
      {comp.rationale && <p className="text-xs text-stone-600 dark:text-stone-400 mt-3 leading-relaxed line-clamp-3">{comp.rationale}</p>}
      {comp.risk_indicators.length > 0 && (
        <div className="mt-3 space-y-1">
          {comp.risk_indicators.slice(0, 2).map((ind, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1">
              <span className="mt-1 w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />{ind}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [facility, setFacility] = useState<FacilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getFacility(id).then(setFacility).catch(() => setError('Analysis not found.')).finally(() => setLoading(false));
  }, [id]);

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

  if (error || !facility) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">Analysis not found</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">The requested facility analysis could not be found.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">Back to Home</button>
        </div>
      </div>
    );
  }

  const satelliteUrl = facility.image_reference ? getSatelliteImageUrl(facility.image_reference) : null;
  const pdfUrl = getReportPdfUrl(facility.analysis_id);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-teal-600 mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50">{facility.display_name}</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)} — {facility.region || 'Pakistan'}</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 capitalize">{facility.sector}</span>
              <RiskBadge band={facility.risk_band} score={facility.risk_score} size="lg" />
            </div>
          </div>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export PDF Report
          </a>
        </div>

        {/* Score overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Risk Score</p>
            {facility.risk_score !== null ? (
              <>
                <p className={`text-4xl font-bold ${facility.risk_band === 'low' ? 'text-green-600 dark:text-green-400' : facility.risk_band === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{facility.risk_score}</p>
                <p className="text-xs text-stone-500 mt-1">out of 100</p>
              </>
            ) : <p className="text-lg font-semibold text-stone-500">Insufficient Data</p>}
          </div>
          <div className="p-6 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Confidence</p>
            {facility.overall_confidence !== null ? (
              <>
                <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">{(facility.overall_confidence * 100).toFixed(0)}%</p>
                <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full mt-2">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${facility.overall_confidence * 100}%` }} />
                </div>
              </>
            ) : <p className="text-lg font-semibold text-stone-500">N/A</p>}
          </div>
          <div className="p-6 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Analysis Date</p>
            <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">{new Date(facility.analyzed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            {facility.acquisition_date && <p className="text-xs text-stone-500 mt-1">Image: {facility.acquisition_date}</p>}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Score Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {facility.components.map((comp) => <ComponentCard key={comp.name} component={comp} />)}
        </div>

        {satelliteUrl && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Satellite Preview</h2>
            <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-emerald-800 shadow-sm">
              <img src={satelliteUrl} alt="Satellite imagery" className="w-full h-64 sm:h-80 object-cover" />
            </div>
            {facility.acquisition_date && <p className="text-xs text-stone-500 mt-2">Acquired: {facility.acquisition_date} — Sentinel-2 (10-20m resolution)</p>}
          </div>
        )}

        {facility.risk_signals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Risk Signals</h2>
            <div className="space-y-2">
              {facility.risk_signals.map((signal, i) => {
                const isFollowUp = signal.toLowerCase().includes('suggested follow-up');
                return (
                  <div key={i} className={`p-3 rounded-lg border ${isFollowUp ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'}`}>
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wider mt-0.5 flex-shrink-0 ${isFollowUp ? 'text-blue-600 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {isFollowUp ? 'Follow-up' : 'Risk Signal'}
                      </span>
                      <p className="text-sm text-stone-700 dark:text-stone-300">{signal}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {facility.rationale && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Why This Score?</h2>
            <div className="p-5 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{facility.rationale}</p>
            </div>
          </div>
        )}

        {facility.disclosure_sources.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Data Sources</h2>
            <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
              <ul className="space-y-1.5">
                <li className="text-sm text-stone-600 dark:text-stone-400">Sentinel Hub — Satellite imagery (Sentinel-2)</li>
                {facility.disclosure_sources.map((src, i) => (
                  <li key={i} className="text-sm text-stone-600 dark:text-stone-400 truncate">
                    {src.startsWith('http') ? <a href={src} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">{src}</a> : src}
                  </li>
                ))}
                <li className="text-sm text-stone-600 dark:text-stone-400">Shipping proxy — Port proximity analysis</li>
              </ul>
            </div>
          </div>
        )}

        {facility.missing_sources.length > 0 && (
          <div className="mb-8 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Missing Data Sources</p>
            <div className="flex flex-wrap gap-2">
              {facility.missing_sources.map((s, i) => (
                <span key={i} className="px-2.5 py-1 rounded-md bg-stone-200 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-400">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/30 border border-stone-200 dark:border-stone-700">
          <p className="text-xs text-stone-500 dark:text-stone-500 leading-relaxed">
            <strong>Legal Disclaimer:</strong> Decision-support risk signal only. Observable satellite evidence does not directly
            measure CO&#8322; or methane. Not a certified audit finding or regulatory attestation.
          </p>
        </div>
      </div>
    </div>
  );
}
