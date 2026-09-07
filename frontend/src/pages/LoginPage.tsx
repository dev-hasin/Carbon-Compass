import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // "?mode=signup" (e.g. from the header Sign Up button) opens the Create
  // Account tab directly; anything else defaults to Sign In.
  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const returnTo = searchParams.get('returnTo') || '/dashboard';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, companyName);
      }
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] geo-grid-animated flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card-3d rounded-2xl border border-carbon-700 bg-carbon-850 p-6 sm:p-8 shadow-depth-2 animate-scale-in">
          {/* Compass mark */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center shadow-glow animate-float-y pop-1">
              <svg className="w-7 h-7 text-carbon-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9" />
                <polygon points="12,4 14,11 12,9 10,11" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-50 mt-4 shimmer-text">Carbon Compass</h1>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'signin' ? 'Sign in to your account' : 'Create your exporter account'}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-carbon-900 border border-carbon-700 mb-6" role="tablist">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  mode === m
                    ? 'bg-accent text-carbon-900 shadow-glow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="company" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Company Name (optional)
                </label>
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Interloop Limited"
                  autoComplete="organization"
                  className="w-full px-4 py-3 rounded-lg bg-carbon-900 border border-carbon-600 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-accent/60 focus:shadow-glow transition-all"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-carbon-900 border border-carbon-600 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-accent/60 focus:shadow-glow transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 rounded-lg bg-carbon-900 border border-carbon-600 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-accent/60 focus:shadow-glow transition-all"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="px-4 py-3 rounded-lg border border-risk-red/40 bg-risk-red/10 text-risk-red text-sm animate-flip-in-x"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-3 rounded-lg bg-accent text-carbon-900 text-sm font-bold hover:bg-accent-soft transition-all shadow-glow btn-3d disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy
                ? 'Please wait…'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          <p className="text-xs text-slate-500 mt-6 text-center leading-relaxed">
            Exporter accounts run live facility analyses. Admin accounts additionally manage demo
            data. See{' '}
            <Link to="/methodology" className="text-accent hover:underline">
              methodology
            </Link>{' '}
            for scoring details.
          </p>
        </div>
      </div>
    </div>
  );
}
