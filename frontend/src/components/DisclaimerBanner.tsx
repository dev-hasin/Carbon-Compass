import { buildCitations } from '../utils/format';
import type { FacilityAnalysis } from '../types';

interface DisclaimerBannerProps {
  /** Optional facility whose data-source citations should be listed (SRS FR-18). */
  facility?: FacilityAnalysis;
  /** 'block' renders the full framed banner; 'inline' renders compact footer text. */
  variant?: 'block' | 'inline';
}

export const DISCLAIMER_TEXT =
  'AI-derived risk signals provided by Carbon Compass are meant for operational decision-support and ' +
  'preparatory self-auditing only. These findings do not constitute official statutory audit findings ' +
  'or legal compliance certifications.';

/**
 * The legal/ethical framing required by SRS section 5.6 and rules.md section 1.
 * Reused across the landing page, dashboard, facility detail, and report screens.
 */
export default function DisclaimerBanner({ facility, variant = 'block' }: DisclaimerBannerProps) {
  if (variant === 'inline') {
    return (
      <p className="text-center text-[11px] leading-relaxed text-slate-600 px-4">
        {DISCLAIMER_TEXT}
      </p>
    );
  }

  const citations = facility ? buildCitations(facility) : [];

  return (
    <div className="rounded-xl border border-carbon-700 bg-carbon-850 p-4 print-plain">
      <div className="flex gap-3">
        <svg
          className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div className="min-w-0">
          <p className="text-xs leading-relaxed text-slate-400">{DISCLAIMER_TEXT}</p>
          {citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-carbon-700">
              <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-1.5">
                DATA SOURCE CITATIONS
              </p>
              <ul className="space-y-1">
                {citations.map((citation, i) => (
                  <li key={i} className="text-[11px] text-slate-500 break-words">
                    [{i + 1}] {citation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
