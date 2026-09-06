import { useState } from 'react';
import { SECTORS } from '../utils/risk';

interface SearchBoxProps {
  onSubmit: (query: string, sector: string) => void;
  isLoading: boolean;
}

export default function SearchBox({ onSubmit, isLoading }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSubmit(query.trim(), sector);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Company Name, Facility, or GPS coordinates..."
            disabled={isLoading}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-carbon-600 bg-carbon-850 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent/60 text-sm shadow-card"
          />
        </div>

        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="px-4 py-3.5 rounded-xl border border-carbon-600 bg-carbon-850 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60 shadow-card min-w-[150px]"
          disabled={isLoading}
        >
          {SECTORS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="px-6 py-3.5 rounded-xl bg-accent text-carbon-900 font-semibold text-sm shadow-glow hover:bg-accent-soft disabled:bg-carbon-600 disabled:text-slate-400 disabled:shadow-none transition-all flex items-center justify-center gap-2 min-w-[150px]"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Analyze Risk
            </>
          )}
        </button>
      </div>
      <p className="mt-2.5 text-center text-xs text-slate-600">
        e.g., Faisalabad Textile Hub, 31.42, 73.08
      </p>
    </form>
  );
}
