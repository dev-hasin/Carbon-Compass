import { useState, type FormEvent } from 'react';
import { changePassword } from '../api';

/**
 * Modal dialog for rotating the signed-in account's password.
 * On success the backend issues a fresh token (stored by the API client) and
 * every older session is revoked.
 */
export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      setDone(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Change password"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-3d rounded-2xl border border-carbon-700 bg-carbon-850 p-6 sm:p-8 shadow-depth-3 animate-scale-in">
          {done ? (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-risk-green/15 border border-risk-green/40 flex items-center justify-center animate-scale-in">
                <svg className="w-6 h-6 text-risk-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-50">Password updated</h2>
                <p className="text-sm text-slate-400 mt-1">
                  All other sessions have been signed out.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-50">Change Password</h2>
                <button
                  type="button"
                  aria-label="Close dialog"
                  onClick={onClose}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-carbon-600 text-slate-400 hover:text-slate-200 hover:border-carbon-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    required
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-lg bg-carbon-900 border border-carbon-600 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-accent/60 focus:shadow-glow transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-lg bg-carbon-900 border border-carbon-600 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-accent/60 focus:shadow-glow transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-lg bg-carbon-900 border border-carbon-600 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-accent/60 focus:shadow-glow transition-all"
                  />
                </div>

                {error && (
                  <div role="alert" className="px-4 py-3 rounded-lg border border-risk-red/40 bg-risk-red/10 text-risk-red text-sm animate-flip-in-x">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full px-4 py-3 rounded-lg bg-accent text-carbon-900 text-sm font-bold hover:bg-accent-soft transition-all shadow-glow btn-3d disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? 'Updating…' : 'Update Password'}
                </button>
              </form>

              <p className="text-xs text-slate-500 mt-4 text-center leading-relaxed">
                Changing your password signs out every other active session immediately.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
