import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBox from '../components/SearchBox';
import DisclaimerBanner from '../components/DisclaimerBanner';
import Reveal from '../components/Reveal';
import { getFacilities } from '../api';
import { useAuth } from '../context/AuthContext';

/**
 * Copy adapted from the Figma reference with SRS-mandated honesty:
 * resolution is stated as 10–20m (Sentinel-2), accuracy claims are replaced
 * with the confidence guard, and "real-time" language is dropped (the SRS
 * rules continuous monitoring out of scope).
 */
const MODULES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    subtitle: 'SENTINEL-2 FEEDS',
    title: 'Satellite Analysis',
    desc: 'Detection of land-use changes, industrial expansion, water discoloration near discharge points, and large thermal signatures from public Sentinel-2 imagery.',
    stat: '10–20m Resolution',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    subtitle: 'NLP CLAIM EXTRACTION',
    title: 'ESG Disclosure Scanning',
    desc: 'Qwen parses public sustainability reports and ESG filings, extracting stated claims about emissions, energy source, and compliance for cross-checking against observable evidence.',
    stat: 'Confidence-Guarded',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    subtitle: 'DECISION-SUPPORT OUTPUT',
    title: 'Risk Scoring (0–100)',
    desc: 'A transparent weighted model combining satellite signals, disclosure discrepancies, and shipment activity — returning Insufficient Data rather than guessing when confidence is low.',
    stat: 'Weighted 40/40/20 Model',
  },
];

const EVIDENCE_SOURCES = [
  'ESA Sentinel-2',
  'Sentinel Hub',
  'Public ESG Disclosures',
  'OpenCage Geocoding',
  'Port Activity Data',
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [facilityCount, setFacilityCount] = useState<number | null>(null);

  // Live stat: real count of analysed facilities — no fabricated marketing
  // numbers. Only fetched for signed-in visitors; anonymous requests would
  // 401 (the registry is an authenticated endpoint), and the landing page
  // must stay open to everyone.
  useEffect(() => {
    if (!user) return;
    getFacilities()
      .then((res) => setFacilityCount(res.total))
      .catch(() => setFacilityCount(null));
  }, [user]);

  const handleAnalyze = (query: string, sector: string) => {
    navigate(`/analysis?query=${encodeURIComponent(query)}&sector=${encodeURIComponent(sector)}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden geo-grid-animated">
        <div className="absolute inset-0 bg-gradient-to-b from-carbon-950 via-transparent to-carbon-900 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-180px] left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-accent/10 blur-[140px] animate-glow-pulse" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-accent text-[11px] font-semibold tracking-widest mb-7 animate-scale-in">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
            EUDR &amp; CBAM COMPLIANCE RADAR
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-50 leading-tight tracking-tight max-w-3xl mx-auto animate-flip-in-x">
            AI-powered supply chain{' '}
            <span className="shimmer-text">sustainability intelligence</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '120ms' }}>
            Audit environmental compliance at the facility level before buyers do.
            Cross-check public satellite imagery and ESG disclosures against
            observable evidence — automatically.
          </p>

          <div className="mt-10 animate-fade-up" style={{ animationDelay: '240ms' }}>
            <SearchBox onSubmit={handleAnalyze} isLoading={false} />
          </div>

          {/* Account CTA for visitors — signed-in users see the live count instead */}
          {!user && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: '320ms' }}>
              <Link
                to="/login?mode=signup"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-accent text-carbon-900 text-sm font-bold hover:bg-accent-soft transition-all shadow-glow btn-3d"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-lg border border-carbon-600 text-sm font-semibold text-slate-200 hover:border-accent/50 hover:text-accent transition-colors btn-3d-ghost"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Live stats — derived from the actual analysis cache */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-sm text-slate-400 animate-fade-up" style={{ animationDelay: '360ms' }}>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-green" />
              {user
                ? facilityCount !== null
                  ? `${facilityCount.toLocaleString()} Facilities Analysed`
                  : 'Loading facility stats...'
                : 'Free exporter account — analyses run on live public data'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Sentinel-2 Optical Pipeline Active
            </span>
          </div>
        </div>
      </section>

      {/* Forensic compliance modules */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <Reveal>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Forensic Compliance Modules</h2>
          <p className="text-sm text-slate-500 mb-8">
            Three independent evidence layers, each with its own confidence value — a missing layer is disclosed, never guessed.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 perspective-1200">
          {MODULES.map((m, i) => (
            <Reveal key={m.title} delay={i * 120} className="h-full">
              <div
                className="group h-full rounded-xl border border-carbon-700 bg-carbon-850 p-6 hover:border-accent/50 transition-colors card-3d preserve-3d"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-lg bg-accent/10 border border-accent/30 text-accent flex items-center justify-center pop-1">
                    {m.icon}
                  </div>
                  <span className="text-[10px] font-semibold tracking-widest text-slate-500 mt-2">
                    {m.subtitle}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2 pop-2">{m.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{m.desc}</p>
                <div className="mt-5 pt-4 border-t border-carbon-700 flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent pop-3">{m.stat}</span>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-accent group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Evidence sources + disclaimer */}
      <section className="mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Reveal>
            <div className="rounded-xl border border-carbon-700 bg-carbon-850 px-6 py-5 hover:border-accent/30 transition-colors duration-500">
              <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-3 text-center">
                VERIFIABLE EVIDENCE SOURCES
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                {EVIDENCE_SOURCES.map((source) => (
                  <span key={source} className="text-sm font-medium text-slate-300 hover:text-accent transition-colors duration-300">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="mt-5">
            <DisclaimerBanner variant="inline" />
          </div>
        </div>
      </section>
    </div>
  );
}
