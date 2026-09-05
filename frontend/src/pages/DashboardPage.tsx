import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FacilityMap, { MapViewMode } from '../components/FacilityMap';
import RiskBadge from '../components/RiskBadge';
import MetricCard from '../components/MetricCard';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { getFacilities, seedDemo } from '../api';
import type { FacilityAnalysis, RiskBand } from '../types';
import { BAND_LABELS, BAND_TEXT } from '../utils/risk';
import { formatConfidence, formatRelativeTime, downloadFacilitiesCsv } from '../utils/format';

const DATE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: '7', label: 'Last 7 Days' },
  { value: '14', label: 'Last 14 Days' },
  { value: '30', label: 'Last 30 Days' },
];

const RISK_FILTERS: { band: RiskBand; label: string; dotClass: string }[] = [
  { band: 'high', label: 'High >60', dotClass: 'bg-risk-red' },
  { band: 'medium', label: 'Mod 30–60', dotClass: 'bg-risk-amber' },
  { band: 'low', label: 'Low <30', dotClass: 'bg-risk-green' },
];

/** Sidebar checkbox group with live counts. */
function FilterGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { value: T; label: string; count: number }[];
  selected: Set<T>;
  onToggle: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-2.5">{title}</p>
      <div className="space-y-1.5">
        {options.map((option) => {
          const active = selected.has(option.value);
          return (
            <button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-accent/10 text-accent'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-carbon-700/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    active ? 'border-accent bg-accent/30' : 'border-carbon-500'
                  }`}
                >
                  {active && (
                    <svg className="w-2.5 h-2.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                      <path d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </span>
                <span className="capitalize">{option.label}</span>
              </span>
              <span className="text-xs text-slate-500">{option.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [facilities, setFacilities] = useState<FacilityAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [sectors, setSectors] = useState<Set<string>>(new Set());
  const [bands, setBands] = useState<Set<RiskBand>>(new Set());
  const [dateRange, setDateRange] = useState('all');
  const [mapMode, setMapMode] = useState<MapViewMode>('pins');

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getFacilities();
      setFacilities(res.facilities);
    } catch {
      setLoadError('Could not reach the Carbon Compass API. Is the backend running on port 8000?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemo();
      await fetchData();
    } finally {
      setSeeding(false);
    }
  };

  // Deep-link support: /dashboard?analyze=<query>&sector=<sector>
  useEffect(() => {
    const analyze = searchParams.get('analyze');
    if (analyze) {
      const sector = searchParams.get('sector') ?? '';
      navigate(`/analysis?query=${encodeURIComponent(analyze)}&sector=${encodeURIComponent(sector)}`, {
        replace: true,
      });
    }
  }, [searchParams, navigate]);

  const sectorOptions = useMemo(() => {
    const counts = new Map<string, number>();
    facilities.forEach((f) => counts.set(f.sector, (counts.get(f.sector) ?? 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }));
  }, [facilities]);

  const regionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    facilities.forEach((f) => counts.set(f.region, (counts.get(f.region) ?? 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, label: value.replace(', Pakistan', ''), count }));
  }, [facilities]);
  const [regions, setRegions] = useState<Set<string>>(new Set());

  const toggleFilter = <T extends string>(set: Set<T>, value: T, setter: (next: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const filtered = useMemo(() => {
    const cutoffDays = dateRange === 'all' ? null : parseInt(dateRange, 10);
    const cutoff = cutoffDays ? Date.now() - cutoffDays * 24 * 60 * 60 * 1000 : null;
    const q = search.trim().toLowerCase();

    return facilities.filter((f) => {
      if (sectors.size > 0 && !sectors.has(f.sector)) return false;
      if (bands.size > 0 && !bands.has(f.risk_band)) return false;
      if (regions.size > 0 && !regions.has(f.region)) return false;
      if (cutoff && new Date(f.analyzed_at).getTime() < cutoff) return false;
      if (q) {
        const haystack = `${f.display_name} ${f.company_name} ${f.region} ${f.latitude.toFixed(3)} ${f.longitude.toFixed(3)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [facilities, sectors, bands, regions, dateRange, search]);

  // Metric cards — derived from the filtered registry, never fabricated
  const metrics = useMemo(() => {
    const scored = filtered.filter((f) => f.risk_score !== null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum, f) => sum + (f.risk_score as number), 0) / scored.length
        : null;
    const highCount = filtered.filter((f) => f.risk_band === 'high').length;
    const updatedToday = filtered.filter(
      (f) => Date.now() - new Date(f.analyzed_at).getTime() < 24 * 60 * 60 * 1000
    ).length;

    return { avgScore, highCount, updatedToday };
  }, [filtered]);

  const hasData = facilities.length > 0;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Global Sourcing Risk</h1>
            <p className="text-sm text-slate-500 mt-1">
              Sustainability risk registry — {filtered.length} of {facilities.length} monitored facilities shown
            </p>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search facility, region, or coordinates..."
              className="w-full sm:w-80 pl-9 pr-4 py-2.5 rounded-lg border border-carbon-600 bg-carbon-850 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-xl border border-risk-amber/50 bg-risk-amber/10 text-sm text-risk-amber-soft flex items-center justify-between">
            <span>{loadError}</span>
            <button onClick={fetchData} className="font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        )}

        {!hasData && !loading ? (
          /* Empty state */
          <div className="rounded-xl border border-carbon-700 bg-carbon-850 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-carbon-700 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">No facilities analysed yet</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
              Run a live self-audit from the search screen, or load the pre-cached demo dataset
              (four facilities covering all risk scenarios, including an intentional insufficient-data case).
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-5 py-2.5 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft disabled:opacity-50"
              >
                {seeding ? 'Loading...' : 'Load Demo Data'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 rounded-lg border border-carbon-600 text-slate-300 text-sm font-medium hover:border-accent/50"
              >
                Run Live Analysis
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Filter sidebar */}
            <aside className="lg:col-span-2 space-y-6 rounded-xl border border-carbon-700 bg-carbon-850 p-4 h-fit">
              <FilterGroup
                title="SECTOR"
                options={sectorOptions}
                selected={sectors}
                onToggle={(v) => toggleFilter(sectors, v, setSectors)}
              />
              <FilterGroup
                title="REGION / ORIGIN"
                options={regionOptions}
                selected={regions}
                onToggle={(v) => toggleFilter(regions, v, setRegions)}
              />

              {/* Risk level toggles */}
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-2.5">RISK LEVEL</p>
                <div className="flex flex-wrap gap-2">
                  {RISK_FILTERS.map(({ band, label, dotClass }) => {
                    const active = bands.has(band);
                    return (
                      <button
                        key={band}
                        onClick={() => toggleFilter(bands, band, setBands)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                          active
                            ? band === 'high'
                              ? 'border-risk-red/60 bg-risk-red/15 text-risk-red-soft'
                              : band === 'medium'
                              ? 'border-risk-amber/60 bg-risk-amber/15 text-risk-amber-soft'
                              : 'border-risk-green/60 bg-risk-green/15 text-risk-green-soft'
                            : 'border-carbon-600 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Satellite pass date */}
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-2.5">
                  LAST ANALYSED
                </p>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-carbon-600 bg-carbon-800 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-accent/60"
                >
                  {DATE_FILTERS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {(sectors.size > 0 || bands.size > 0 || regions.size > 0 || dateRange !== 'all') && (
                <button
                  onClick={() => {
                    setSectors(new Set());
                    setBands(new Set());
                    setRegions(new Set());
                    setDateRange('all');
                  }}
                  className="w-full py-2 rounded-md border border-carbon-600 text-xs text-slate-400 hover:text-accent hover:border-accent/50 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </aside>

            {/* Main column */}
            <div className="lg:col-span-10 space-y-6">
              {/* Metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard
                  label="Monitored Facilities"
                  value={String(filtered.length)}
                  sublabel={`+${metrics.updatedToday} analysed today`}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 21v-7m0 0V8.25m0 6.75l-5.25-3.1M12 15l5.25-3.1M3 9.2v5.6c0 .5.27.97.71 1.22l7.5 4.5c.48.29 1.09.29 1.57 0l7.5-4.5c.44-.25.71-.71.71-1.22V9.2c0-.5-.27-.97-.71-1.22l-7.5-4.5a1.55 1.55 0 00-1.57 0l-7.5 4.5C3.27 8.23 3 8.7 3 9.2z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Average Risk Score"
                  value={metrics.avgScore !== null ? metrics.avgScore.toFixed(1) : '—'}
                  sublabel={
                    metrics.avgScore !== null
                      ? `${BAND_LABELS[metrics.avgScore < 30 ? 'low' : metrics.avgScore <= 60 ? 'medium' : 'high']} median`
                      : 'No scored facilities in view'
                  }
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                      <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="High Risk Signals"
                  value={String(metrics.highCount)}
                  sublabel="Worth reviewing before a buyer audit"
                  valueClass={metrics.highCount > 0 ? 'text-risk-red-soft' : 'text-slate-100'}
                  sublabelClass={metrics.highCount > 0 ? 'text-risk-red/70' : 'text-slate-500'}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  }
                />
              </div>

              {/* Map with pins/heatmap toggle */}
              <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-3">
                <div className="flex items-center justify-between px-1 pb-3">
                  <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                    FACILITY GEO-INTEL
                  </p>
                  <div className="flex rounded-lg border border-carbon-600 overflow-hidden">
                    {(['pins', 'heatmap'] as MapViewMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setMapMode(mode)}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                          mapMode === mode
                            ? 'bg-accent/15 text-accent'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode === 'pins' ? 'Pins' : 'Heatmap'}
                      </button>
                    ))}
                  </div>
                </div>
                {loading ? (
                  <div className="h-[420px] rounded-xl border border-carbon-700 bg-carbon-800 flex items-center justify-center">
                    <svg className="w-7 h-7 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="h-[420px] rounded-xl border border-dashed border-carbon-600 flex items-center justify-center text-sm text-slate-500">
                    No facilities match the current filters.
                  </div>
                ) : (
                  <FacilityMap facilities={filtered} mode={mapMode} className="h-[420px]" />
                )}
              </div>

              {/* Monitored exporters registry */}
              <div className="rounded-xl border border-carbon-700 bg-carbon-850">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-carbon-700">
                  <h2 className="text-sm font-semibold text-slate-100">
                    Monitored Exporters Registry
                  </h2>
                  <button
                    onClick={() => downloadFacilitiesCsv(filtered)}
                    disabled={filtered.length === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-carbon-600 text-xs font-semibold text-slate-300 hover:border-accent/50 hover:text-accent disabled:opacity-40 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        {['FACILITY', 'LOCATION', 'RISK SCORE', 'CONFIDENCE', 'LAST ANALYSED'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[10px] font-semibold tracking-widest text-slate-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((f) => (
                        <tr
                          key={f.analysis_id}
                          onClick={() => navigate(`/facility/${f.analysis_id}`)}
                          className="border-t border-carbon-700 cursor-pointer hover:bg-carbon-800/70 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-200">{f.display_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{f.company_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-slate-400 tabular-nums">
                              {f.latitude.toFixed(3)}, {f.longitude.toFixed(3)}
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">{f.region}</p>
                          </td>
                          <td className="px-4 py-3">
                            {f.risk_score !== null ? (
                              <span className={`text-sm font-bold tabular-nums ${BAND_TEXT[f.risk_band]}`}>
                                {Math.round(f.risk_score)}/100
                              </span>
                            ) : (
                              <RiskBadge band="unknown" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-300">
                              {formatConfidence(f.overall_confidence)}
                            </span>
                            {f.overall_confidence !== null && (
                              <div className="w-16 h-1 rounded-full bg-carbon-700 mt-1.5">
                                <div
                                  className="h-full rounded-full bg-accent"
                                  style={{ width: `${Math.round(f.overall_confidence * 100)}%` }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {formatRelativeTime(f.analyzed_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer disclaimer */}
        <div className="mt-6">
          <DisclaimerBanner variant="inline" />
        </div>
      </div>
    </div>
  );
}
