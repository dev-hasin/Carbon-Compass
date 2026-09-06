import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: ReactNode;
  /** Tailwind text color for the value, e.g. 'text-risk-red-soft'. */
  valueClass?: string;
  sublabelClass?: string;
}

export default function MetricCard({
  label,
  value,
  sublabel,
  icon,
  valueClass = 'text-slate-100',
  sublabelClass = 'text-slate-500',
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-carbon-700 bg-carbon-800 p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-carbon-700 flex items-center justify-center text-accent flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${valueClass}`}>{value}</p>
        {sublabel && <p className={`text-xs mt-0.5 ${sublabelClass}`}>{sublabel}</p>}
      </div>
    </div>
  );
}
