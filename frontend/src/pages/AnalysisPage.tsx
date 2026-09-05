import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { analyzeFacilityStream } from '../api';
import type { SSEEvent } from '../api';
import { getSatelliteImageUrl } from '../api';

type StageStatus = 'pending' | 'running' | 'completed' | 'insufficient_data' | 'error';

interface StageInfo {
  key: string;
  label: string;
  icon: string;
  status: StageStatus;
  detail?: string;
}

const INITIAL_STAGES: StageInfo[] = [
  { key: 'geocoding', label: 'Resolving Location', icon: 'geo', status: 'pending' },
  { key: 'satellite', label: 'Fetching Satellite Imagery', icon: 'sat', status: 'pending' },
  { key: 'disclosure', label: 'Scanning ESG Disclosures', icon: 'doc', status: 'pending' },
  { key: 'ai_analysis', label: 'AI Cross-Analysis', icon: 'ai', status: 'pending' },
  { key: 'scoring', label: 'Computing Risk Score', icon: 'score', status: 'pending' },
];

export default function AnalysisPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get('q') || '';
  const sector = params.get('sector') || undefined;

  const [stages, setStages] = useState<StageInfo[]>(INITIAL_STAGES);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [imageRef, setImageRef] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Run stream once
  useEffect(() => {
    if (startedRef.current || !query) return;
    startedRef.current = true;

    analyzeFacilityStream(query, sector, (event: SSEEvent) => {
      switch (event.type) {
        case 'init':
          setAnalysisId(event.data.analysis_id);
          break;

        case 'stage': {
          const { stage, status, ...rest } = event.data;
          setStages((prev) =>
            prev.map((s) =>
              s.key === stage
                ? {
                    ...s,
                    status: status as StageStatus,
                    detail: stageDetail(stage, rest),
                  }
                : s,
            ),
          );
          if (stage === 'satellite' && rest.image_reference) {
            setImageRef(rest.image_reference as string);
          }
          break;
        }

        case 'complete':
          setAnalysisId(event.data.analysis_id);
          // Navigate to facility detail after a brief delay
          setTimeout(() => navigate(`/facility/${event.data.analysis_id}`), 1200);
          break;

        case 'error':
          setError(event.data.message);
          break;
      }
    }).catch((err) => {
      setError(err.message || 'Analysis failed.');
    });
  }, [query, sector, navigate]);

  const completedCount = stages.filter(
    (s) => s.status === 'completed' || s.status === 'insufficient_data',
  ).length;
  const progressPct = Math.round((completedCount / stages.length) * 100);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-50 dark:bg-forest-950">
      <div className="w-full max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/40 mb-4">
            <svg
              className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">
            Analyzing Facility
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 font-mono">
            {query}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            Elapsed: {elapsed}s
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-stone-400 mt-1">{progressPct}%</p>
        </div>

        {/* Stage list */}
        <div className="space-y-3">
          {stages.map((stage) => (
            <StageRow key={stage.key} stage={stage} />
          ))}
        </div>

        {/* Satellite preview */}
        {imageRef && (
          <div className="mt-6 rounded-xl overflow-hidden border border-stone-200 dark:border-emerald-800 shadow-sm">
            <img
              src={getSatelliteImageUrl(imageRef)}
              alt="Satellite preview"
              className="w-full h-40 object-cover"
            />
            <p className="text-[10px] text-stone-400 dark:text-stone-500 px-3 py-1.5 bg-white dark:bg-forest-900">
              Satellite imagery captured
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-3 text-xs text-red-600 dark:text-red-400 underline"
            >
              Back to search
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-[10px] text-stone-400 dark:text-stone-500 mt-8">
          Risk signal analysis only. Not a certified audit finding.
        </p>
      </div>
    </div>
  );
}

function StageRow({ stage }: { stage: StageInfo }) {
  const { status, label, detail } = stage;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
        status === 'running'
          ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
          : status === 'completed'
          ? 'bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800'
          : status === 'insufficient_data'
          ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50'
          : status === 'error'
          ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'
          : 'bg-stone-50 dark:bg-forest-900/50 border border-stone-200 dark:border-emerald-900/30'
      }`}
    >
      <StageIcon status={status} />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            status === 'running'
              ? 'text-teal-700 dark:text-teal-300'
              : status === 'completed'
              ? 'text-stone-900 dark:text-stone-100'
              : status === 'insufficient_data'
              ? 'text-amber-700 dark:text-amber-300'
              : status === 'error'
              ? 'text-red-700 dark:text-red-300'
              : 'text-stone-400 dark:text-stone-600'
          }`}
        >
          {label}
        </p>
        {detail && (
          <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

function StageIcon({ status }: { status: StageStatus }) {
  if (status === 'completed') {
    return (
      <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }
  if (status === 'insufficient_data') {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  // pending
  return (
    <div className="w-6 h-6 rounded-full border-2 border-stone-300 dark:border-stone-600 flex-shrink-0" />
  );
}

function stageDetail(stage: string, data: Record<string, unknown>): string | undefined {
  switch (stage) {
    case 'geocoding':
      return data.display_name ? `Found: ${data.display_name}` : undefined;
    case 'satellite':
      return data.acquisition_date ? `Image from ${data.acquisition_date}` : undefined;
    case 'disclosure': {
      const sources = data.sources as string[] | undefined;
      return sources && sources.length > 0
        ? `${sources.length} source${sources.length > 1 ? 's' : ''} found`
        : 'No public disclosures found';
    }
    case 'ai_analysis': {
      const count = data.risk_signals_count as number | undefined;
      return count != null ? `${count} risk signal${count !== 1 ? 's' : ''} detected` : undefined;
    }
    case 'scoring': {
      const score = data.risk_score;
      const band = data.risk_band;
      if (score != null && band) return `Score: ${score} — ${String(band).toUpperCase()}`;
      if (band === 'unknown') return 'Insufficient data — no score computed';
      return undefined;
    }
    default:
      return undefined;
  }
}
