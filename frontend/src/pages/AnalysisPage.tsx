import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { streamAnalysis } from '../api';
import SatelliteImage from '../components/SatelliteImage';
import type { AnalysisStage } from '../types';

interface StageState {
  status: 'pending' | 'running' | 'completed';
  detail: string;
}

const STAGES: { id: AnalysisStage; title: string; pendingHint: string }[] = [
  {
    id: 'geocoding_satellite',
    title: 'Geocoding & Satellite Fetch',
    pendingHint: 'Resolving the query to coordinates and retrieving the latest clear-sky Sentinel-2 pass.',
  },
  {
    id: 'disclosure_scanning',
    title: 'ESG Disclosure Scanning',
    pendingHint: 'Scraping public sustainability reports and ESG news mentions for stated claims.',
  },
  {
    id: 'ai_cross_analysis',
    title: 'AI Cross-Analysis',
    pendingHint: 'Qwen compares satellite observations against extracted disclosure claims.',
  },
  {
    id: 'risk_scoring',
    title: 'Risk Score Computation',
    pendingHint: 'Aggregating weighted risk attributions (Satellite 40%, Disclosure 40%, Shipment 20%).',
  },
];

/** Radar-style scan visual (Figma "SCANNING GRID" card) with 3D depth. */
function ScanVisual() {
  return (
    <div className="relative w-full aspect-square max-w-[260px] mx-auto animate-float-y">
      <div className="absolute inset-[-12%] rounded-full bg-accent/5 blur-2xl" />
      {[100, 72, 46, 22].map((size) => (
        <div
          key={size}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/25 transition-transform duration-700"
          style={{ width: `${size}%`, height: `${size}%` }}
        />
      ))}
      {/* Sweep */}
      <div className="absolute inset-0 rounded-full overflow-hidden animate-glow-pulse">
        <div
          className="absolute inset-0 animate-radar-sweep"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(34,211,238,0.35) 0deg, rgba(34,211,238,0.08) 60deg, transparent 90deg)',
          }}
        />
      </div>
      {/* Risk-band sample dots */}
      <span className="absolute top-[14%] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-risk-red shadow-glow" />
      <span className="absolute top-1/2 left-[16%] -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-risk-amber" />
      <span className="absolute top-1/2 right-[16%] -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot" />
      <span className="absolute bottom-[16%] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-risk-green" />
      {/* Center */}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent" />
      <p className="absolute bottom-[-8px] inset-x-0 text-center text-[10px] font-bold tracking-widest text-accent">
        SCANNING FACILITY GRID
      </p>
    </div>
  );
}

function formatElapsed(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenth = Math.floor((totalSeconds * 10) % 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenth}`;
}

export default function AnalysisPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('query') ?? '';
  const sector = searchParams.get('sector') ?? '';

  const [stageStates, setStageStates] = useState<Record<string, StageState>>(() =>
    Object.fromEntries(
      STAGES.map((s) => [s.id, { status: 'pending', detail: s.pendingHint } as StageState])
    )
  );
  const [imageRef, setImageRef] = useState<string | null>(null);
  const [acquisitionDate, setAcquisitionDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const startRef = useRef<number>(Date.now());
  const navigatedRef = useRef(false);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(timer);
  }, []);

  // Single analysis run per mount — stream stages into the UI as they resolve.
  useEffect(() => {
    if (!query) {
      setError('No query provided. Start an analysis from the home page.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    streamAnalysis(
      query,
      sector || null,
      (event) => {
        if (event.type === 'init') {
          // Reset every stage to pending so the run starts from a clean slate.
          setStageStates(
            Object.fromEntries(
              STAGES.map((s) => [s.id, { status: 'pending', detail: s.pendingHint } as StageState])
            )
          );
        } else if (event.type === 'stage') {
          setStageStates((prev) => ({
            ...prev,
            [event.stage]: { status: event.status, detail: event.detail },
          }));
          if (event.image_reference) setImageRef(event.image_reference);
          if (event.acquisition_date) setAcquisitionDate(event.acquisition_date);
        } else if (event.type === 'complete') {
          navigatedRef.current = true;
          navigate(`/facility/${event.analysis.analysis_id}`, { replace: true });
        } else if (event.type === 'error') {
          setError(event.error);
        }
      },
      controller.signal
    ).catch((err) => {
      if (controller.signal.aborted) return;
      setError(
        err?.message === 'The user aborted a request.'
          ? null
          : 'Analysis stream interrupted. Check that the backend is running, then try again.'
      );
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sector]);

  const cancel = () => {
    abortRef.current?.abort();
    navigate('/', { replace: true });
  };

  if (!query && error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-100 mb-2">No analysis requested</h2>
          <p className="text-sm text-slate-400 mb-5">{error}</p>
          <Link to="/" className="px-5 py-2.5 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <button
            onClick={cancel}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-accent transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Cancel Analysis
          </button>
          <p className="mt-3 text-[11px] font-semibold tracking-widest text-accent flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
            ANALYSIS ENGINE ACTIVE
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mt-2">
            Analyzing {query}
          </h1>
          {sector && (
            <p className="text-sm text-slate-500 mt-1">
              Sector: <span className="text-slate-300 capitalize">{sector}</span>
            </p>
          )}
        </div>
        <div className="text-right animate-slide-in-right">
          <p className="text-[10px] font-semibold tracking-widest text-slate-500">ELAPSED TIME</p>
          <p className="text-2xl font-bold text-accent tabular-nums">
            {formatElapsed(elapsed)}
          </p>
        </div>
      </div>

      {error ? (
        <div className="max-w-lg mx-auto rounded-xl border border-risk-red/50 bg-risk-red/10 p-6 text-center">
          <svg className="w-8 h-8 text-risk-red-soft mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Analysis could not complete</h2>
          <p className="text-sm text-slate-400 mb-5">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/" className="px-5 py-2.5 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft">
              Try Again
            </Link>
            <Link to="/dashboard" className="px-5 py-2.5 rounded-lg border border-carbon-600 text-slate-300 text-sm font-medium hover:border-accent/50">
              View Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Stage task list */}
          <div className="lg:col-span-3 rounded-xl border border-carbon-700 bg-carbon-850 p-6 animate-slide-in-right shadow-depth-1">
            <div className="space-y-5">
              {STAGES.map((stage, index) => {
                const state = stageStates[stage.id];
                const isRunning = state.status === 'running';
                const isDone = state.status === 'completed';
                return (
                  <div
                    key={stage.id}
                    className={`rounded-lg p-4 border transition-all duration-500 ease-out-expo ${
                      isRunning
                        ? 'border-accent/60 bg-accent/5 stage-running-glow transform translate-x-1'
                        : isDone
                        ? 'border-risk-green/20 transform translate-x-0'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Status icon */}
                      {isDone ? (
                        <span className="w-7 h-7 rounded-full bg-risk-green/15 border border-risk-green/50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-risk-green-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </span>
                      ) : isRunning ? (
                        <span className="w-7 h-7 rounded-full bg-accent/15 border border-accent flex items-center justify-center flex-shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot" />
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-full border border-carbon-600 text-slate-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          {index + 1}
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                        <p
                          className={`text-[10px] font-bold tracking-widest mt-0.5 ${
                            isDone ? 'text-risk-green-soft' : isRunning ? 'text-accent' : 'text-slate-600'
                          }`}
                        >
                          {isDone ? 'COMPLETED' : isRunning ? 'RUNNING' : 'PENDING'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          {state.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-5 pt-4 border-t border-carbon-700 text-xs text-slate-600 italic">
              * Typical analysis completes in 15–30 seconds. Do not refresh this page.
            </p>
          </div>

          {/* Scan visual + satellite diagnostic */}
          <div className="lg:col-span-2 space-y-6 perspective-1200">
            <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-6 animate-scale-in hover:border-accent/40 transition-colors duration-500 shadow-depth-1">
              <ScanVisual />
            </div>

            <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-4 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-3">
                SATELLITE PASS DIAGNOSTIC
              </p>
              {imageRef ? (
                <SatelliteImage
                  imageReference={imageRef}
                  acquisitionDate={acquisitionDate}
                  observations={[]}
                  liveLabel="SENTINEL-2 L2A"
                  className="h-44"
                />
              ) : (
                <div className="h-44 rounded-xl border border-dashed border-carbon-600 bg-carbon-800/50 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-7 h-7 text-slate-600 mx-auto animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-xs text-slate-600 mt-2">Awaiting satellite pass...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
