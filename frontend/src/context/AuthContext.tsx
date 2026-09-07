import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { login as apiLogin, register as apiRegister, getCurrentUser, logout as apiLogout, getToken, clearToken } from '../api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companyName: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on mount: a stored token is validated against /auth/me.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await getCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        // Stale/expired token: drop it so the visitor is treated as signed
        // out without being navigated away from any public page.
        clearToken();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const resp = await apiLogin(email, password);
    setUser(resp.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, companyName: string) => {
    const resp = await apiRegister(email, password, companyName);
    setUser(resp.user);
  }, []);

  const signOut = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      signIn,
      signUp,
      signOut,
    }),
    [user, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
