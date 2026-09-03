import { useState, useEffect } from 'react';
import FacilityMap from '../components/FacilityMap';
import RiskBadge from '../components/RiskBadge';
import { getHeatmap, seedDemo } from '../api';
import type { HeatmapPoint } from '../types';
import { useNavigate } from 'react-router-dom';

const SECTORS = [
  { value: 'all', label: 'All Sectors' },
  { value: 'textile', label: 'Textile' },
  { value: 'leather', label: 'Leather' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'mixed', label: 'Mixed' },
];

export default function DashboardPage() {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [sector, setSector] = useState('all');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  const fetchData = async (s: string) => {
    setLoading(true);
    try {
      const res = await getHeatmap(s === 'all' ? undefined : s);
      setPoints(res.points);
    } catch {
      setPoints([]);
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Sustainability Dashboard</h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
              {points.length} facilit{points.length === 1 ? 'y' : 'ies'} analysed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-emerald-800 bg-white dark:bg-forest-900 text-sm text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {SECTORS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-4 py-2 rounded-lg bg-white dark:bg-forest-900 border border-stone-300 dark:border-emerald-800 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-forest-900/80 disabled:opacity-50 transition-colors"
            >
              {seeding ? 'Seeding...' : 'Load Demo Data'}
            </button>
          </div>
        </div>

        {points.length === 0 && !loading ? (
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
          /* Map + facility list */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
            <div className="lg:col-span-2 min-h-[400px] lg:min-h-0">
              <FacilityMap
                points={points}
                center={[31.4, 73.5]}
                zoom={7}
                className="h-full min-h-[400px]"
              />
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[600px] lg:max-h-[calc(100vh-12rem)] pr-1">
              {points.map((point) => (
                <button
                  key={point.analysis_id}
                  onClick={() => navigate(`/facility/${point.analysis_id}`)}
                  className="w-full text-left p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {point.display_name}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-500 mt-0.5 capitalize">
                        {point.sector} — {point.latitude.toFixed(2)}, {point.longitude.toFixed(2)}
                      </p>
                    </div>
                    <RiskBadge band={point.risk_band} score={point.risk_score} size="sm" />
                  </div>
                </button>
              ))}
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
