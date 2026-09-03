import { useState } from 'react';

interface SearchBoxProps {
  onSubmit: (query: string, sector: string) => void;
  isLoading: boolean;
}

const SECTORS = [
  { value: '', label: 'Any sector' },
  { value: 'textile', label: 'Textile' },
  { value: 'leather', label: 'Leather' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'mixed', label: 'Mixed' },
];

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
              className="w-5 h-5 text-stone-400 dark:text-stone-500"
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
            placeholder="Company name, address, or GPS coordinates (e.g. 31.42, 73.08)"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-white dark:bg-forest-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm shadow-sm"
            disabled={isLoading}
          />
        </div>

        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="px-4 py-3.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-white dark:bg-forest-900 text-stone-700 dark:text-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm min-w-[140px]"
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
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:from-stone-300 disabled:to-stone-400 dark:disabled:from-stone-700 dark:disabled:to-stone-800 text-white font-semibold text-sm shadow-sm hover:shadow-md disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2 min-w-[160px]"
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Analyze Facility
            </>
          )}
        </button>
      </div>
    </form>
  );
}
