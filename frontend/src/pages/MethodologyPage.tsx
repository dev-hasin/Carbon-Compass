import { Link } from 'react-router-dom';

const PIPELINE_STAGES = [
  {
    num: 1,
    title: 'Data Ingestion',
    desc: 'Resolve facility location via geocoding, fetch the latest clear-sky Sentinel-2 satellite image, scrape public ESG disclosures, and estimate shipping activity via port-proximity analysis.',
    sources: ['OpenCage Geocoding', 'Sentinel Hub (Sentinel-2 L2A)', 'DuckDuckGo + BeautifulSoup', 'Port Proximity Analysis'],
  },
  {
    num: 2,
    title: 'AI Analysis',
    desc: 'Qwen vision model analyses the satellite image for visible land-use indicators. Qwen text model extracts stated sustainability claims from disclosures. A discrepancy engine compares claims against observable evidence.',
    sources: ['Qwen-VL-Max (vision)', 'Qwen-Max (text)', 'Discrepancy detection engine'],
  },
  {
    num: 3,
    title: 'Risk Scoring',
    desc: 'A weighted formula aggregates three signal layers into a single Sustainability Risk Score (0–100). Each component has an independent confidence check — if any layer lacks data, it is excluded and weights are re-normalised.',
    sources: ['Satellite Signal (40%)', 'Disclosure Discrepancy (40%)', 'Shipment Activity (20%)'],
  },
  {
    num: 4,
    title: 'Presentation',
    desc: 'Results are displayed on an interactive map with colour-coded pins, a density heatmap, and per-facility detail panels with plain-language explanations and exportable PDF reports.',
    sources: ['Leaflet + OSM tiles', 'leaflet.heat density layer', 'fpdf2 PDF generation'],
  },
];

const RISK_BANDS = [
  { band: 'Low', range: '0 – 29', color: 'bg-green-500', desc: 'Few or no observable risk signals. Routine self-check recommended.' },
  { band: 'Medium', range: '30 – 60', color: 'bg-amber-500', desc: 'Some risk signals detected. Worth reviewing before a buyer audit.' },
  { band: 'High', range: '61 – 100', color: 'bg-red-500', desc: 'Elevated risk signals. Proactive remediation advised.' },
  { band: 'Insufficient Data', range: 'N/A', color: 'bg-gray-400', desc: 'Not enough public data to compute a score. Never guessed.' },
];

const DATA_SOURCES = [
  { name: 'Sentinel Hub', type: 'Satellite imagery', detail: 'Sentinel-2 L2A optical (10–20m resolution). Detects visible land-use change, not gas emissions.' },
  { name: 'Public ESG Disclosures', type: 'Web scraping', detail: 'DuckDuckGo search + BeautifulSoup extraction of sustainability reports, news, and ESG pages.' },
  { name: 'Port Proximity Analysis', type: 'Shipping activity', detail: 'Distance-weighted analysis to Karachi Port, Port Qasim, and Gwadar port facilities.' },
  { name: 'Qwen (Alibaba Cloud)', type: 'AI models', detail: 'qwen-vl-max for vision analysis, qwen-max for text extraction and discrepancy detection.' },
  { name: 'OpenCage', type: 'Geocoding', detail: 'Company name / address to GPS coordinates. Falls back to known Pakistani city dictionary.' },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-2">Methodology</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-50">How Carbon Compass Works</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 max-w-2xl leading-relaxed">
            Carbon Compass is a three-layer pipeline that turns public data into decision-support risk signals
            for Pakistani export facilities. It never claims to measure emissions directly or certify compliance.
          </p>
        </div>

        {/* Pipeline stages */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-6">Pipeline Stages</h2>
          <div className="space-y-4">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.num} className="p-5 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-teal-700 dark:text-teal-300">{stage.num}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">{stage.title}</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-3">{stage.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {stage.sources.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[11px] text-stone-600 dark:text-stone-400">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Scoring formula */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Scoring Formula</h2>
          <div className="p-5 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
            <div className="bg-stone-50 dark:bg-stone-900/50 rounded-lg p-4 mb-4 font-mono text-sm text-stone-800 dark:text-stone-200 text-center">
              Score = (Satellite × 0.4) + (Disclosure × 0.4) + (Shipping × 0.2)
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
              Weights are re-normalised when one or more components have insufficient data. For example, if shipping
              data is unavailable, the score is computed from satellite (50%) and disclosure (50%) only.
            </p>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Confidence guard:</strong> If all three layers return insufficient data, no score is computed.
                The facility is labelled "Insufficient Data" — never a guessed number.
              </p>
            </div>
          </div>
        </section>

        {/* Risk bands */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Risk Bands</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RISK_BANDS.map((b) => (
              <div key={b.band} className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${b.color}`} />
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{b.band}</span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 ml-auto">{b.range}</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data sources */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Data Sources</h2>
          <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-emerald-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-900/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-500">Source</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-500">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-500 hidden sm:table-cell">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-emerald-900/50">
                {DATA_SOURCES.map((ds) => (
                  <tr key={ds.name} className="bg-white dark:bg-forest-900">
                    <td className="px-4 py-3 text-stone-900 dark:text-stone-100 font-medium">{ds.name}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{ds.type}</td>
                    <td className="px-4 py-3 text-stone-500 dark:text-stone-500 text-xs hidden sm:table-cell">{ds.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">FAQ</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">Does Carbon Compass measure CO₂ or methane?</h4>
              <p className="text-sm text-stone-600 dark:text-stone-400">No. Sentinel-2 optical imagery detects visible land-use proxies only — not gas emissions. This is stated on every screen and report.</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">What happens when there is not enough data?</h4>
              <p className="text-sm text-stone-600 dark:text-stone-400">The confidence guard returns "Insufficient Data" for that component. If all components are insufficient, no score is computed — the system never guesses.</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-forest-900 border border-stone-200 dark:border-emerald-800">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">Is this a certified audit?</h4>
              <p className="text-sm text-stone-600 dark:text-stone-400">No. Carbon Compass is a decision-support risk signal tool. It is not a substitute for a formal ESG audit or regulatory attestation.</p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/30 border border-stone-200 dark:border-stone-700 mb-8">
          <p className="text-xs text-stone-500 dark:text-stone-500 leading-relaxed">
            <strong>Disclaimer:</strong> All outputs are labelled "Risk Signal" or "Suggested Follow-up" — never a confirmed
            finding. Carbon Compass uses Qwen via Alibaba Cloud Model Studio. Satellite data from Sentinel Hub.
          </p>
        </div>

        <div className="text-center">
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm">
            Explore the Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
