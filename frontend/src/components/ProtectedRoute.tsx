import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Full-screen loading state while the session is being restored. */
function SessionLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-carbon-600 border-t-accent animate-spin" />
        <p className="text-sm text-slate-500">Restoring session…</p>
      </div>
    </div>
  );
}

/**
 * Route guard: requires a signed-in user (any role). Unauthenticated visitors
 * are redirected to /login with a returnTo param so they land back here after
 * signing in.
 */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SessionLoading />;
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }
  return children;
}

/**
 * Route guard: requires the admin role on top of being signed in. Users are
 * bounced to the dashboard with no error flash (they simply lack the role).
 */
export function AdminRoute({ children }: { children: ReactElement }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <SessionLoading />;
  if (!user || !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
