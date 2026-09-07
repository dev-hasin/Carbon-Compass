import type { CSSProperties } from 'react';
import type { ComponentResult } from '../types';
import { BAND_HEX, bandOfScore } from '../utils/risk';
import { formatConfidence } from '../utils/format';

/**
 * Weighted risk-attribution bar (Figma "Bayesian Risk Attributions" /
 * "Weighted Risk Score Breakdown", adapted to the SRS weighted formula).
 * The fill animates in from zero on mount (see `score-fill` in index.css).
 */
export default function ScoreBar({ component }: { component: ComponentResult }) {
  const ok = component.status === 'ok' && component.score !== null;
  const band = bandOfScore(component.score);
  const color = ok ? BAND_HEX[band] : '#475569';
  const width = ok ? Math.min(100, Math.max(0, component.score as number)) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1.5">
        <p className="text-sm font-semibold text-slate-100">
          {component.label}
          <span className="ml-2 text-xs font-medium text-slate-500">
            {Math.round(component.weight * 100)}% Weight
          </span>
        </p>
        <p className="text-sm font-bold tabular-nums" style={{ color }}>
          {ok ? `${Math.round(component.score as number)}/100` : 'Insufficient Data'}
        </p>
      </div>

      <div
        className="h-2 rounded-full bg-carbon-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={ok ? Math.round(width) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ok ? `${component.label} score` : `${component.label} — insufficient data`}
      >
        <div
          className="h-full rounded-full score-fill"
          style={{ '--score-width': `${width}%`, backgroundColor: color } as CSSProperties}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mt-1.5">
        <p className="text-xs text-slate-500 flex-1">{component.rationale}</p>
        <p className="text-xs text-slate-400 sm:whitespace-nowrap sm:ml-3">
          {ok && component.confidence !== null
            ? `${formatConfidence(component.confidence)} Confidence`
            : 'Excluded from score'}
        </p>
      </div>
    </div>
  );
}
