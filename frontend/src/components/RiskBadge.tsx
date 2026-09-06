import type { RiskBand } from '../types';
import { BAND_LABELS } from '../utils/risk';

interface RiskBadgeProps {
  band: RiskBand;
  score?: number | null;
  /**
   * 'chip' — inline pill for tables and cards.
   * 'panel' — large bordered square + label for detail/report headers.
   */
  variant?: 'chip' | 'panel';
}

const CHIP_CLASSES: Record<RiskBand, string> = {
  low: 'border-risk-green/50 bg-risk-green/10 text-risk-green-soft',
  medium: 'border-risk-amber/50 bg-risk-amber/10 text-risk-amber-soft',
  high: 'border-risk-red/50 bg-risk-red/10 text-risk-red-soft',
  unknown: 'border-slate-600 bg-slate-700/30 text-slate-400',
};

const PANEL_CLASSES: Record<RiskBand, string> = {
  low: 'border-risk-green',
  medium: 'border-risk-amber',
  high: 'border-risk-red',
  unknown: 'border-slate-500',
};

const DOT_CLASSES: Record<RiskBand, string> = {
  low: 'bg-risk-green',
  medium: 'bg-risk-amber',
  high: 'bg-risk-red',
  unknown: 'bg-slate-500',
};

export default function RiskBadge({ band, score, variant = 'chip' }: RiskBadgeProps) {
  if (variant === 'panel') {
    return (
      <div className="flex items-center gap-3">
        <div
          className={`w-16 h-16 rounded-xl border-2 ${PANEL_CLASSES[band]} bg-carbon-800 flex items-center justify-center`}
        >
          <span className="text-3xl font-bold text-slate-100">
            {score !== null && score !== undefined ? Math.round(score) : '—'}
          </span>
        </div>
        <div>
          <p className={`text-sm font-semibold tracking-wide uppercase ${band === 'high' ? 'text-risk-red-soft' : band === 'medium' ? 'text-risk-amber-soft' : band === 'low' ? 'text-risk-green-soft' : 'text-slate-400'}`}>
            {BAND_LABELS[band]}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Sustainability Risk Score</p>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${CHIP_CLASSES[band]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASSES[band]}`} />
      {band === 'unknown'
        ? 'Insufficient Data'
        : `${score !== null && score !== undefined ? Math.round(score) : '—'} · ${BAND_LABELS[band]}`}
    </span>
  );
}
