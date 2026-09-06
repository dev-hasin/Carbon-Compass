import type { FacilityAnalysis } from '../types';
import { componentOf, claimTopic, claimIsFlagged } from '../utils/risk';

/**
 * Discrepancy Audit: Self-Disclosure vs. Geo-Evidence (Figma reference).
 *
 * Pairs each extracted disclosure claim with the observable evidence the
 * AI layer collected. A claim is "flagged" when a risk signal references
 * the same topic — the same framing the scoring engine uses, so the table
 * never invents severity the backend did not produce.
 */
export default function DiscrepancyTable({ facility }: { facility: FacilityAnalysis }) {
  const disclosure = componentOf(facility, 'disclosure');
  const satellite = componentOf(facility, 'satellite');

  const claims = disclosure?.extracted_claims ?? [];
  const observations = satellite?.observations ?? [];

  if (claims.length === 0) {
    return (
      <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-5 text-center print-plain">
        <p className="text-sm text-slate-400">No public disclosure claims available to audit.</p>
        <p className="text-xs text-slate-600 mt-1">
          The disclosure component is flagged Insufficient Data — nothing was estimated to fill the gap.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-carbon-700 print-plain">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-carbon-800 text-left">
            <th className="px-3 py-2.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Topic</th>
            <th className="px-3 py-2.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Company Statement / Claim</th>
            <th className="px-3 py-2.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Observable Geo-Evidence</th>
            <th className="px-3 py-2.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Signal</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim, i) => {
            const flagged = claimIsFlagged(claim, facility.risk_signals);
            const evidence = observations[i] ?? observations[0];
            return (
              <tr key={i} className="border-t border-carbon-700 align-top">
                <td className="px-3 py-3 text-xs font-semibold text-slate-300">
                  {claimTopic(claim)}
                </td>
                <td className="px-3 py-3 text-xs text-slate-400 max-w-[220px]">
                  "{claim}"
                </td>
                <td className="px-3 py-3 text-xs text-slate-400 max-w-[220px]">
                  {evidence
                    ? `Satellite observation: ${evidence}`
                    : 'No satellite observation collected for this analysis'}
                </td>
                <td className="px-3 py-3">
                  {flagged ? (
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-risk-red/15 text-risk-red-soft border border-risk-red/40">
                      REVIEW SUGGESTED
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-risk-green/10 text-risk-green-soft border border-risk-green/40">
                      NO SIGNAL FLAGGED
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
