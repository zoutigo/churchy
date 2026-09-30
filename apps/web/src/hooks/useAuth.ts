'use client';
import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api/auth.api';
import { saveSession, clearSession, getSession } from '@/lib/auth/session';
import type { RegisterDto, LoginDto, AuthResponse } from '@churchy/shared';

type AuthUser = AuthResponse['user'];

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = getSession();
    if (token) {
      authApi.me()
        .then(setUser)
        .catch(() => clearSession())
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, []);

  const login = useCallback(async (dto: LoginDto) => {
    setLoading(true);
    try {
      const res = await authApi.login(dto);
      saveSession(res.tokens.accessToken);
      setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (dto: RegisterDto) => {
    setLoading(true);
    try {
      const res = await authApi.register(dto);
      saveSession(res.tokens.accessToken);
      setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return { user, loading, initializing, login, register, logout };
}
