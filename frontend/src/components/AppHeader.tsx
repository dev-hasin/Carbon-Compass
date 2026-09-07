import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';

const NAV_ITEMS = [
  { path: '/', label: 'Platform', end: true },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/methodology', label: 'Methodology' },
];

export default function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  const handleSignOut = () => {
    setUserMenuOpen(false);
    signOut();
    closeMenu();
    navigate('/');
  };

  const openPwdModal = () => {
    setUserMenuOpen(false);
    closeMenu();
    setPwdModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-50 no-print border-b border-carbon-700/60 bg-carbon-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + product tag */}
          <Link to="/" className="flex items-center gap-3 group" onClick={closeMenu}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center shadow-glow group-hover:shadow-glow transition-shadow group-hover:rotate-12 duration-300">
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

          {/* Primary nav (desktop) */}
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

          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative hidden sm:block">
                {/* Signed-in identity chip → account menu */}
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 pl-3 ml-1 border-l border-carbon-700/60 group"
                >
                  <div
                    className="w-8 h-8 rounded-full bg-carbon-700 border border-carbon-600 flex items-center justify-center text-xs font-bold text-accent group-hover:border-accent/50 transition-colors"
                    title={user.email}
                  >
                    {(user.company_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col leading-tight max-w-[160px]">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {user.company_name || user.email}
                    </span>
                    <span
                      className={`text-[10px] font-bold tracking-widest uppercase ${
                        isAdmin ? 'text-risk-amber' : 'text-slate-500'
                      }`}
                    >
                      {isAdmin ? 'Admin' : 'Exporter'}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-60 z-50 rounded-xl border border-carbon-700 bg-carbon-850 shadow-depth-2 p-2 animate-scale-in origin-top-right"
                    >
                      <div className="px-3 py-2 border-b border-carbon-700 mb-1">
                        <p className="text-xs font-semibold text-slate-200 truncate">
                          {user.company_name || user.email}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={openPwdModal}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-accent hover:bg-carbon-700/60 transition-colors"
                      >
                        Change Password
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-risk-red hover:bg-carbon-700/60 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-carbon-600 text-sm font-semibold text-slate-200 hover:border-accent/50 hover:text-accent transition-colors btn-3d-ghost"
                >
                  Sign In
                </Link>
                {/* Self-serve account creation — opens the Create Account tab */}
                <Link
                  to="/login?mode=signup"
                  className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-accent text-carbon-900 text-sm font-semibold hover:bg-accent-soft transition-colors shadow-glow btn-3d"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-carbon-600 text-slate-300 hover:text-accent hover:border-accent/50 transition-colors"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel — flips open in 3D from the top edge */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-out-expo ${
          menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav
          className={`px-4 sm:px-6 pb-4 pt-1 bg-carbon-900/95 backdrop-blur-md border-b border-carbon-700/60 origin-top ${
            menuOpen ? 'animate-flip-in-x' : ''
          }`}
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item, i) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={closeMenu}
                style={{ animationDelay: `${i * 60}ms` }}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-lg text-sm font-medium transition-colors animate-fade-up ${
                    isActive
                      ? 'text-accent bg-accent/10'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-carbon-700/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href="/methodology#data-sources"
              onClick={closeMenu}
              className="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-carbon-700/60 transition-colors animate-fade-up"
              style={{ animationDelay: '180ms' }}
            >
              Data Sources
            </a>
            {user ? (
              <>
                <div className="flex flex-col leading-tight px-4 py-3 animate-fade-up" style={{ animationDelay: '180ms' }}>
                  <span className="text-sm font-semibold text-slate-200 truncate">
                    {user.company_name || user.email}
                  </span>
                  <span
                    className={`text-[10px] font-bold tracking-widest uppercase ${
                      isAdmin ? 'text-risk-amber' : 'text-slate-500'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'Exporter'} · {user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={openPwdModal}
                  className="px-4 py-3 rounded-lg border border-carbon-600 text-sm font-medium text-slate-300 hover:text-accent hover:border-accent/50 transition-colors animate-fade-up text-center"
                  style={{ animationDelay: '210ms' }}
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-3 rounded-lg border border-carbon-600 text-sm font-medium text-slate-300 hover:text-risk-red hover:border-risk-red/50 transition-colors animate-fade-up"
                  style={{ animationDelay: '240ms' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="px-4 py-3 rounded-lg border border-carbon-600 text-sm font-medium text-slate-300 hover:text-accent hover:border-accent/50 transition-colors animate-fade-up text-center"
                  style={{ animationDelay: '180ms' }}
                >
                  Sign In
                </Link>
                <Link
                  to="/login?mode=signup"
                  onClick={closeMenu}
                  className="mt-2 px-4 py-3 rounded-lg bg-accent text-carbon-900 text-sm font-semibold text-center shadow-glow animate-fade-up"
                  style={{ animationDelay: '240ms' }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {pwdModalOpen && <ChangePasswordModal onClose={() => setPwdModalOpen(false)} />}
    </header>
  );
}
