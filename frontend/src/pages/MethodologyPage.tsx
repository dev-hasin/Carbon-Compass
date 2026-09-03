import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DisclaimerBanner from '../components/DisclaimerBanner';

/**
 * Copy adapted from the Figma "how it works" reference with SRS-mandated
 * honesty: the scoring model is the transparent weighted formula from FR-9
 * (not "Bayesian"), no SAR/Landsat/real-time claims, and every output is
 * framed as a Risk Signal rather than a confirmed finding (FR-17).
 */
const PIPELINE_STAGES = [
  {
    stage: 'STAGE 01',
    title: 'Data Ingestion',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    desc: 'Geocoding resolves the query to coordinates. Sentinel-2 multispectral imagery, public ESG disclosures, and port-activity signals are fetched independently and normalised into a common schema.',
  },
  {
    stage: 'STAGE 02',
    title: 'AI Cross-Analysis',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    desc: 'Qwen vision analysis interprets the satellite scene while text analysis extracts stated claims from disclosures — then cross-checks each assertion against the observable evidence.',
  },
  {
    stage: 'STAGE 03',
    title: 'Risk Scoring',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    desc: 'A transparent weighted model (Satellite 40%, Disclosure 40%, Shipment 20%) aggregates the layers, guarded by confidence thresholds that exclude low-confidence data instead of guessing.',
  },
  {
    stage: 'STAGE 04',
    title: 'Actionable Output',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    desc: 'A facility-level Sustainability Risk Score with plain-language "Why this score?" explanations, an interactive Sustainability Heatmap, and a shareable forensic PDF report.',
  },
];

const WEIGHTS = [
  { label: 'Satellite Signal', weight: 40, desc: 'Observable indicators from Sentinel-2 imagery' },
  { label: 'Disclosure Discrepancy', weight: 40, desc: 'Gap between stated claims and evidence' },
  { label: 'Shipment Activity', weight: 20, desc: 'Port-proximity operational intensity proxy' },
];

const BANDS = [
  { label: 'Green · Low Risk', range: 'Score below 30', chip: 'border-risk-green/60 bg-risk-green/10 text-risk-green-soft', dot: 'bg-risk-green' },
  { label: 'Amber · Moderate Risk', range: 'Score 30–60', chip: 'border-risk-amber/60 bg-risk-amber/10 text-risk-amber-soft', dot: 'bg-risk-amber' },
  { label: 'Red · High Risk', range: 'Score above 60', chip: 'border-risk-red/60 bg-risk-red/10 text-risk-red-soft', dot: 'bg-risk-red' },
];

const FAQ = [
  {
    q: 'How does Carbon Compass detect environmental risk signals?',
    a: 'Sentinel-2 imagery of the facility footprint is analysed by AI for observable features — land-use patterns, nearby water bodies, and surrounding industrial density. Those observations are cross-checked against the company\'s public sustainability claims. Every mismatch is surfaced as a Risk Signal for investigation, never as a confirmed finding of pollution or non-compliance.',
  },
  {
    q: 'Can this report be submitted directly for EUDR or CBAM compliance?',
    a: 'No. Carbon Compass reports are AI-derived decision-support tools for operational self-auditing and preparedness. They surface where to look before a formal buyer audit — they are not certified statutory audit findings or legal compliance attestations.',
  },
  {
    q: 'What happens when there is "Insufficient Data"?',
    a: 'When a layer\'s confidence falls below the guard threshold — for example degraded satellite imagery or no scrapeable disclosures — that layer is flagged Insufficient Data and excluded from the score. The remaining weights re-normalise, and nothing is estimated to fill the gap. If overall confidence is too low, no score is issued at all.',
  },
];

const DATA_SOURCES = [
  {
    source: 'Sentinel Hub',
    layer: 'Satellite',
    detail: 'Sentinel-2 L2A multispectral imagery over a ~2 km facility footprint, retrieved on demand.',
  },
  {
    source: 'OpenCage Geocoding',
    layer: 'Geocoding',
    detail: 'Resolves a company name or address to latitude/longitude coordinates.',
  },
  {
    source: 'Public web disclosures',
    layer: 'Disclosure',
    detail: 'Web search surfaces public sustainability reports and ESG news mentions; text is extracted for claim parsing.',
  },
  {
    source: 'Port-activity proxy',
    layer: 'Shipment',
    detail: 'Proximity to major Pakistani ports (Karachi Port, Port Qasim) as an operational-intensity proxy.',
  },
  {
    source: 'Alibaba Cloud Model Studio (Qwen)',
    layer: 'AI analysis',
    detail: 'qwen-vl-max interprets satellite imagery; qwen-max extracts disclosure claims and performs cross-analysis.',
  },
  {
    source: 'Alibaba Cloud OSS',
    layer: 'Storage',
    detail: 'Stores retrieved satellite images, scraped text, and generated reports (with a local cache fallback in the prototype).',
  },
];

export default function MethodologyPage() {
  const { hash } = useLocation();

  // Support the header's "Data Sources" anchor (/methodology#data-sources).
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [hash]);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden geo-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-carbon-950 via-transparent to-carbon-900 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-accent text-[11px] font-semibold tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
            METHODOLOGY &amp; CONFIDENCE MODEL
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 leading-tight tracking-tight">
            Defensible supply chain environmental verification
          </h1>
          <p className="mt-5 text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Our forensic engine eliminates guesswork. We match public corporate sustainability
            disclosures against physical satellite observation using a transparent, verifiable
            weighted scoring model.
          </p>
        </div>
      </section>

      {/* Verifiable risk processing pipeline */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Verifiable Risk Processing Pipeline</h2>
        <p className="text-sm text-slate-500 mb-8">
          Each analysis runs through four stages — the same pipeline you watch live on the analysis screen.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.stage} className="rounded-xl border border-carbon-700 bg-carbon-850 p-5">
              <div className="w-11 h-11 rounded-lg bg-carbon-700 flex items-center justify-center text-accent mb-4">
                {stage.icon}
              </div>
              <p className="text-[10px] font-bold tracking-widest text-accent">{stage.stage}</p>
              <h3 className="text-sm font-semibold text-slate-100 mt-1 mb-2">{stage.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{stage.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring formula + confidence model */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scoring formula breakdown */}
          <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-6">
            <h2 className="text-base font-bold text-slate-100 mb-3">Scoring Formula Breakdown</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              The Sustainability Risk Score aggregates independent signal layers in a fixed weighted
              model. If a layer returns Insufficient Data, its weight is redistributed across the
              remaining layers — the formula stays transparent at every step.
            </p>
            <div className="space-y-5 mb-6">
              {WEIGHTS.map((w) => (
                <div key={w.label}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-sm font-semibold text-accent">
                      {w.label}
                      <span className="ml-2 text-xs font-medium text-slate-500">{w.weight}% Weight</span>
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-carbon-700 overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${w.weight}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{w.desc}</p>
                </div>
              ))}
            </div>
            <div className="pt-5 border-t border-carbon-700">
              <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-3">
                RISK BANDS (0–100 SCALE)
              </p>
              <div className="space-y-2">
                {BANDS.map((band) => (
                  <div
                    key={band.label}
                    className={`inline-flex w-full items-center justify-between rounded-lg border px-3 py-2 ${band.chip}`}
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <span className={`w-1.5 h-1.5 rounded-full ${band.dot}`} />
                      {band.label}
                    </span>
                    <span className="text-[11px] font-medium">{band.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Verification confidence model */}
          <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-6">
            <h2 className="text-base font-bold text-slate-100 mb-3">Verification Confidence Model</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Every finding is bound to a confidence level derived from data quality. Degraded
              satellite imagery, sparse disclosures, or weak sourcing each lower the layer's
              confidence — and a layer below the guard threshold is excluded from scoring entirely
              rather than guessed.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Each score is published with its per-layer confidence indicators and the full list of
              data-source citations, so any figure in a report can be traced back to the evidence
              that produced it.
            </p>
            <div className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-bold tracking-widest text-accent">
                PROTECTING AUDIT TRACEABILITY OVER GUESSWORK
              </p>
            </div>
            <p className="text-[11px] text-slate-600 mt-4 leading-relaxed">
              Note: without API keys configured, the platform runs the same pipeline in deterministic
              mock mode for demonstration purposes.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <h2 className="text-xl font-bold text-slate-100 mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-carbon-700 bg-carbon-850 p-5">
              <h3 className="text-sm font-semibold text-slate-100 mb-2">{item.q}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data sources */}
      <section id="data-sources" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Data Sources</h2>
        <p className="text-sm text-slate-500 mb-8">
          Carbon Compass uses only publicly available data — no private, paywalled, or authenticated
          supplier systems are ever accessed.
        </p>
        <div className="overflow-x-auto rounded-xl border border-carbon-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-carbon-800 text-left">
                <th className="px-4 py-2.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Source</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Pipeline Layer</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">What It Provides</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SOURCES.map((src) => (
                <tr key={src.source} className="border-t border-carbon-700 align-top">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-300">{src.source}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border border-accent/40 bg-accent/10 text-accent">
                      {src.layer.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{src.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-carbon-700/60 bg-carbon-850/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Ready to verify your facilities?</h2>
            <p className="text-sm text-slate-400 mt-1">Start an immediate geo-forensic analysis.</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft transition-colors shadow-glow flex-shrink-0"
          >
            Begin Live Self-Audit
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DisclaimerBanner />
      </div>
    </div>
  );
}
