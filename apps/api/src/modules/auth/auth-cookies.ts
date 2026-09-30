import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env';

export const COOKIES = {
  /** JWT d'accès, court. Envoyé à toute l'API. */
  ACCESS: 'churchy_at',
  /** Jeton de rafraîchissement : envoyé uniquement aux routes /api/auth. */
  REFRESH: 'churchy_rt',
  /**
   * Indicateur « une session existe » (valeur « 1 », aucun secret) lu par le middleware et le code
   * du site web : il évite d'interroger l'API pour les visiteurs anonymes. Volontairement non httpOnly.
   */
  SESSION: 'churchy_session',
} as const;

export interface Session {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const base = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
});

export function setAuthCookies(res: Response, session: Session) {
  const refreshMaxAge = Math.max(session.refreshExpiresAt.getTime() - Date.now(), 0);
  res.cookie(COOKIES.ACCESS, session.accessToken, {
    ...base(),
    path: '/',
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(COOKIES.REFRESH, session.refreshToken, {
    ...base(),
    path: '/api/auth',
    maxAge: refreshMaxAge,
  });
  res.cookie(COOKIES.SESSION, '1', {
    ...base(),
    httpOnly: false,
    path: '/',
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIES.ACCESS, { ...base(), path: '/' });
  res.clearCookie(COOKIES.REFRESH, { ...base(), path: '/api/auth' });
  res.clearCookie(COOKIES.SESSION, { ...base(), httpOnly: false, path: '/' });
}
