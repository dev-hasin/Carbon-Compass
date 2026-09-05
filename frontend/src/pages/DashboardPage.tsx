import { useState, useEffect, useMemo } from 'react';
import FacilityMap from '../components/FacilityMap';
import RiskBadge from '../components/RiskBadge';
import { getHeatmap, seedDemo } from '../api';
import type { HeatmapPoint } from '../types';
import { useNavigate } from 'react-router-dom';

const SECTORS = ['all', 'textile', 'leather', 'manufacturing', 'mixed'];
const RISK_LEVELS = ['all', 'low', 'medium', 'high', 'unknown'];

function exportCSV(facilities: HeatmapPoint[]) {
  const header = 'Facility,Sector,Region,Latitude,Longitude,Risk Score,Risk Band';
  const rows = facilities.map((f) =>
    `"${f.display_name}","${f.sector}","${f.latitude.toFixed(4)}","${f.longitude.toFixed(4)}","${f.risk_score ?? 'N/A'}","${f.risk_band}"`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'carbon-compass-exporters.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const [allPoints, setAllPoints] = useState<HeatmapPoint[]>([]);
  const [sector, setSector] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  const fetchData = async (s: string) => {
    setLoading(true);
    try {
      const res = await getHeatmap(s === 'all' ? undefined : s);
      setAllPoints(res.points);
    } catch {
      setAllPoints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(sector);
  }, [sector]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemo();
      await fetchData(sector);
    } catch {
      // ignore
    } finally {
      setSeeding(false);
    }
  };

  // Filtered points
  const points = useMemo(() => {
    if (riskFilter === 'all') return allPoints;
    return allPoints.filter((p) => p.risk_band === riskFilter);
  }, [allPoints, riskFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const scored = allPoints.filter((p) => p.risk_score !== null);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((s, p) => s + (p.risk_score ?? 0), 0) / scored.length)
      : null;
    const highRisk = allPoints.filter((p) => p.risk_band === 'high').length;
    const insufficient = allPoints.filter((p) => p.risk_band === 'unknown').length;
    return { total: allPoints.length, avgScore, highRisk, insufficient };
  }, [allPoints]);

  // Unique regions from current data
  const regions = useMemo(() => {
    const set = new Set(allPoints.map((p) => {
      // Infer region from point (not stored in HeatmapPoint, so skip)
      return '';
    }));
    return Array.from(set).filter(Boolean);
  }, [allPoints]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Sustainability Dashboard</h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
              {allPoints.length} facilit{allPoints.length === 1 ? 'y' : 'ies'} analysed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-emerald-800 bg-white dark:bg-forest-900 text-sm text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'All Sectors' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={() => exportCSV(points)}
              disabled={points.length === 0}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-emerald-800 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-forest-900 disabled:opacity-50 transition-colors"
              title="Export registry as CSV"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </button>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-4 py-2 rounded-lg bg-white dark:bg-forest-900 border border-stone-300 dark:border-emerald-800 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-forest-900/80 disabled:opacity-50 transition-colors"
            >
              {seeding ? 'Seeding...' : 'Load Demo Data'}
            </button>
          </div>
        </div>

        {/* Metric cards */}
        {allPoints.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Monitored</p>
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{metrics.total}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg Risk Score</p>
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{metrics.avgScore ?? '—'}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">High Risk</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.highRisk}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Insufficient</p>
              <p className="text-2xl font-bold text-stone-500">{metrics.insufficient}</p>
            </div>
          </div>
        )}

        {allPoints.length === 0 && !loading ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-12">
              <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
                No facilities analysed yet
              </h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                Search for a facility on the home page, or load demo data to explore.
              </p>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
              >
                {seeding ? 'Loading...' : 'Load Demo Data'}
              </button>
            </div>
          </div>
        ) : (
          /* Map + sidebar + facility list */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
            {/* Sidebar filters */}
            <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
              {/* Risk filter */}
              <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">Risk Level</p>
                <div className="space-y-1.5">
                  {RISK_LEVELS.map((r) => {
                    const count = r === 'all' ? allPoints.length : allPoints.filter((p) => p.risk_band === r).length;
                    const isActive = riskFilter === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setRiskFilter(r)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium'
                            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {r !== 'all' && (
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              r === 'low' ? 'bg-green-500' : r === 'medium' ? 'bg-amber-500' : r === 'high' ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                          )}
                          {r === 'all' ? 'All Levels' : r === 'unknown' ? 'Insufficient' : r.charAt(0).toUpperCase() + r.slice(1)}
                        </span>
                        <span className="text-xs text-stone-400">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Map + list */}
            <div className="lg:col-span-3 flex flex-col gap-4 min-h-0 order-1 lg:order-2">
              <div className="min-h-[400px] lg:min-h-[400px] flex-1">
                <FacilityMap
                  points={points}
                  center={[31.4, 73.5]}
                  zoom={7}
                  className="h-full min-h-[400px]"
                />
              </div>

              {/* Facility registry table */}
              <div className="rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-emerald-900/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Monitored Exporters</p>
                  <button
                    onClick={() => exportCSV(points)}
                    disabled={points.length === 0}
                    className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-stone-50 dark:bg-stone-900/50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-stone-500">Facility</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-stone-500">Sector</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-stone-500">Score</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-stone-500">Band</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-emerald-900/30">
                      {points.map((point) => (
                        <tr
                          key={point.analysis_id}
                          onClick={() => navigate(`/facility/${point.analysis_id}`)}
                          className="cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-medium text-stone-900 dark:text-stone-100 truncate max-w-[200px]">{point.display_name}</td>
                          <td className="px-4 py-2.5 text-stone-600 dark:text-stone-400 capitalize">{point.sector}</td>
                          <td className="px-4 py-2.5 text-center font-semibold text-stone-900 dark:text-stone-100">{point.risk_score ?? '—'}</td>
                          <td className="px-4 py-2.5 text-center"><RiskBadge band={point.risk_band} score={point.risk_score} size="sm" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <footer className="border-t border-stone-200 dark:border-emerald-900/50 py-4 mt-4">
        <p className="text-center text-xs text-stone-500 dark:text-stone-500 px-4">
          Decision-support risk signal only. Not a certified audit finding or regulatory attestation.
        </p>
      </footer>
    </div>
  );
}
