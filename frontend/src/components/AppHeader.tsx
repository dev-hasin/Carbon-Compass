import { Link, NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Platform', end: true },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/methodology', label: 'Methodology' },
];

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 no-print border-b border-carbon-700/60 bg-carbon-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + product tag */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center shadow-glow group-hover:shadow-glow transition-shadow">
              <svg className="w-5 h-5 text-carbon-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9" />
                <polygon points="12,4 14,11 12,9 10,11" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-widest text-slate-100">
              CARBON COMPASS
            </span>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full border border-accent/40 bg-accent/10 text-accent text-[10px] font-semibold tracking-widest">
              AI GEO-INTEL
            </span>
          </Link>

          {/* Primary nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-accent bg-accent/10'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-carbon-700/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href="/methodology#data-sources"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-carbon-700/60 transition-colors"
            >
              Data Sources
            </a>
          </nav>

          {/* Self-serve entry point */}
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft transition-colors shadow-glow"
          >
            Exporters Portal
          </Link>
        </div>
      </div>
    </header>
  );
}
