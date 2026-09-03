import type { FacilityAnalysis, RiskBand } from '../types';

/** Sector taxonomy used across search, dashboard filters, and analysis. */
export const SECTORS = [
  { value: '', label: 'Any sector' },
  { value: 'textile', label: 'Textile' },
  { value: 'leather', label: 'Leather' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'mixed', label: 'Mixed' },
] as const;

/** Risk bands per SRS FR-12: Green < 30, Amber 30-60, Red > 60. */
export function bandOfScore(score: number | null | undefined): RiskBand {
  if (score === null || score === undefined) return 'unknown';
  if (score < 30) return 'low';
  if (score <= 60) return 'medium';
  return 'high';
}

export const BAND_LABELS: Record<RiskBand, string> = {
  low: 'Low Risk',
  medium: 'Moderate Risk',
  high: 'High Risk',
  unknown: 'Insufficient Data',
};

export const BAND_HEX: Record<RiskBand, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  unknown: '#8B98A9',
};

/** Tailwind text color per band (used in scores, table cells, headings). */
export const BAND_TEXT: Record<RiskBand, string> = {
  low: 'text-risk-green-soft',
  medium: 'text-risk-amber-soft',
  high: 'text-risk-red-soft',
  unknown: 'text-slate-400',
};

/** Tailwind border + tint classes per band (used in badges and chips). */
export const BAND_CHIP: Record<RiskBand, string> = {
  low: 'border-risk-green/60 bg-risk-green/10 text-risk-green-soft',
  medium: 'border-risk-amber/60 bg-risk-amber/10 text-risk-amber-soft',
  high: 'border-risk-red/60 bg-risk-red/10 text-risk-red-soft',
  unknown: 'border-slate-600 bg-slate-700/30 text-slate-400',
};

export function confidenceLabel(confidence: number | null): string {
  if (confidence === null) return 'N/A';
  if (confidence >= 0.85) return 'Very High';
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

/** Look up a facility's component result by name ('satellite' | 'disclosure' | 'shipping'). */
export function componentOf(
  facility: FacilityAnalysis,
  name: string
) {
  return facility.components.find((c) => c.name === name);
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has',
  'are', 'was', 'were', 'not', 'their', 'them', 'its', 'into', 'near',
  'since', 'been', 'public', 'company', 'report', 'reports', 'stated',
  'states', 'claims', 'claim', 'facility', 'annual', 'energy', 'management',
  'environmental', 'verification', 'third-party', 'disclosed', 'disclosure',
]);

/**
 * Tokenize text into lowercase keywords for claim ↔ risk-signal matching.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOPWORDS.has(t));
}

/**
 * True when a risk signal references the same topic as a disclosure claim.
 * Used to pair claims with flagged discrepancies in the audit table.
 */
export function claimIsFlagged(claim: string, riskSignals: string[]): boolean {
  const claimTokens = new Set(tokenize(claim));
  if (claimTokens.size === 0) return false;
  return riskSignals.some((signal) => {
    const shared = tokenize(signal).filter((t) => claimTokens.has(t));
    return shared.length >= 1;
  });
}

/** Categorize a disclosure claim into an audit topic label. */
export function claimTopic(claim: string): string {
  const c = claim.toLowerCase();
  if (/(emission|carbon|ghg|greenhouse)/.test(c)) return 'Emissions';
  if (/(renewable|solar|energy|fossil|fuel|coal)/.test(c)) return 'Energy Source';
  if (/(water|effluent|discharge|treatment)/.test(c)) return 'Water & Effluent';
  if (/(waste|recycle|recycling|disposal)/.test(c)) return 'Waste Management';
  if (/(iso|certif|leed|audit|verified)/.test(c)) return 'Certification';
  return 'General Disclosure';
}
