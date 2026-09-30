'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUserDto, LoginDto, RegisterDto } from '@churchy/shared';
import { authApi } from '@/lib/api/auth.api';
import { hasSessionFlag, SESSION_EXPIRED_EVENT } from '@/lib/auth/session';

export interface AuthContextValue {
  user: AuthUserDto | null;
  /** Vrai pendant la vérification initiale de la session (évite d'afficher un état « déconnecté » à tort). */
  initializing: boolean;
  /** Vrai pendant un login / register / logout. */
  loading: boolean;
  /** Vrai si la session a été perdue alors que l'utilisateur naviguait (et non une simple visite anonyme). */
  sessionExpired: boolean;
  /** Vrai après une déconnexion volontaire : on retourne à /login sans mémoriser de page de retour. */
  loggedOut: boolean;
  login: (dto: LoginDto) => Promise<AuthUserDto>;
  register: (dto: RegisterDto) => Promise<AuthUserDto>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      setUser(null);
    }
  }, []);

  // Au chargement : on n'appelle l'API que si le navigateur porte un cookie de session.
  useEffect(() => {
    if (!hasSessionFlag()) {
      setInitializing(false);
      return;
    }
    refreshUser().finally(() => setInitializing(false));
  }, [refreshUser]);

  // Émis par le client API quand le refresh échoue : la session est définitivement perdue.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setSessionExpired(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const withLoading = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      return await action();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    (dto: LoginDto) =>
      withLoading(async () => {
        const res = await authApi.login(dto);
        setSessionExpired(false);
        setLoggedOut(false);
        setUser(res.user);
        return res.user;
      }),
    [withLoading],
  );

  const register = useCallback(
    (dto: RegisterDto) =>
      withLoading(async () => {
        const res = await authApi.register(dto);
        setSessionExpired(false);
        setLoggedOut(false);
        setUser(res.user);
        return res.user;
      }),
    [withLoading],
  );

  const logout = useCallback(
    () =>
      withLoading(async () => {
        try {
          await authApi.logout();
        } finally {
          // Même si le serveur est injoignable, l'interface ne doit plus se présenter comme connectée.
          setUser(null);
          setSessionExpired(false);
          setLoggedOut(true);
        }
      }),
    [withLoading],
  );

  const value = useMemo(
    () => ({
      user,
      initializing,
      loading,
      sessionExpired,
      loggedOut,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, initializing, loading, sessionExpired, loggedOut, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return ctx;
}
