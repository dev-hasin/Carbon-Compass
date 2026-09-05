import { useNavigate } from 'react-router-dom';
import SearchBox from '../components/SearchBox';

const FEATURES = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    title: 'Satellite Analysis',
    desc: 'Land-use changes, plume-like features, water discoloration — observable proxies from Sentinel-2 imagery.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'ESG Disclosure Scanning',
    desc: 'Cross-check public sustainability claims against physical evidence from satellite and activity data.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Risk Scoring (0–100)',
    desc: 'Weighted aggregation with confidence guardrails. Insufficient Data instead of guessing.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const handleAnalyze = async (query: string, sector: string) => {
    const params = new URLSearchParams({ q: query });
    if (sector) params.set('sector', sector);
    navigate(`/analyze?${params.toString()}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-forest-950 dark:via-forest-900 dark:to-emerald-950/50" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            AI-Powered Sustainability Risk Platform
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 dark:text-stone-50 leading-tight tracking-tight">
            Self-check your export compliance risk{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-600">
              before buyers do.
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto leading-relaxed">
            AI-powered sustainability risk signals from public satellite data, ESG disclosures,
            and activity proxies — for Pakistani textile, leather, and manufacturing exporters.
          </p>

          <div className="mt-10">
            <SearchBox onSubmit={handleAnalyze} isLoading={false} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="w-12 h-12 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">{f.title}</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Satellite Disclaimer</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Satellite imagery is observable evidence only. It does not directly measure CO&#8322; or methane emissions.
                All scores are decision-support risk signals, not certified audit findings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer disclaimer */}
      <footer className="border-t border-stone-200 dark:border-emerald-900/50 py-6">
        <p className="text-center text-xs text-stone-500 dark:text-stone-500 max-w-2xl mx-auto px-4">
          Decision-support risk signal only. Not a certified audit finding or regulatory attestation.
          Carbon Compass uses Qwen via Alibaba Cloud Model Studio + Alibaba Cloud OSS.
        </p>
      </footer>
    </div>
  );
}
