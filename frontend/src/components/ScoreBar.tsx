import type { ComponentResult } from '../types';
import { BAND_HEX, bandOfScore } from '../utils/risk';
import { formatConfidence } from '../utils/format';

/**
 * Weighted risk-attribution bar (Figma "Bayesian Risk Attributions" /
 * "Weighted Risk Score Breakdown", adapted to the SRS weighted formula).
 */
export default function ScoreBar({ component }: { component: ComponentResult }) {
  const ok = component.status === 'ok' && component.score !== null;
  const band = bandOfScore(component.score);
  const color = ok ? BAND_HEX[band] : '#475569';
  const width = ok ? Math.min(100, Math.max(0, component.score as number)) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-sm font-semibold text-slate-100">
          {component.label}
          <span className="ml-2 text-xs font-medium text-slate-500">
            {Math.round(component.weight * 100)}% Weight
          </span>
        </p>
        <p className="text-sm font-bold" style={{ color }}>
          {ok ? `${Math.round(component.score as number)}/100` : 'Insufficient Data'}
        </p>
      </div>

      <div className="h-2 rounded-full bg-carbon-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-slate-500">{component.rationale}</p>
        <p className="text-xs text-slate-400 whitespace-nowrap ml-3">
          {ok && component.confidence !== null
            ? `${formatConfidence(component.confidence)} Confidence`
            : 'Excluded from score'}
        </p>
      </div>
    </div>
  );
}
