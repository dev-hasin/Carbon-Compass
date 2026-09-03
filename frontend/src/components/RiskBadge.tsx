import type { RiskBand } from '../types';

interface RiskBadgeProps {
  band: RiskBand;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

const bandConfig: Record<RiskBand, { label: string; light: string; dark: string; text: string }> = {
  low: {
    label: 'Low Risk',
    light: 'bg-green-100 border-green-300',
    dark: 'dark:bg-green-900/30 dark:border-green-700',
    text: 'text-green-800 dark:text-green-300',
  },
  medium: {
    label: 'Medium Risk',
    light: 'bg-amber-100 border-amber-300',
    dark: 'dark:bg-amber-900/30 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-300',
  },
  high: {
    label: 'High Risk',
    light: 'bg-red-100 border-red-300',
    dark: 'dark:bg-red-900/30 dark:border-red-700',
    text: 'text-red-800 dark:text-red-300',
  },
  unknown: {
    label: 'Insufficient Data',
    light: 'bg-stone-100 border-stone-300',
    dark: 'dark:bg-stone-800 dark:border-stone-600',
    text: 'text-stone-600 dark:text-stone-400',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function RiskBadge({ band, score, size = 'md' }: RiskBadgeProps) {
  const config = bandConfig[band];
  const displayText =
    band === 'unknown'
      ? 'Insufficient Data'
      : score !== null && score !== undefined
      ? `${score} — ${config.label}`
      : config.label;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${config.light} ${config.dark} ${config.text} ${sizeClasses[size]}`}
    >
      <span
        className={`w-2 h-2 rounded-full mr-1.5 ${
          band === 'low'
            ? 'bg-green-500'
            : band === 'medium'
            ? 'bg-amber-500'
            : band === 'high'
            ? 'bg-red-500'
            : 'bg-stone-400'
        }`}
      />
      {displayText}
    </span>
  );
}
