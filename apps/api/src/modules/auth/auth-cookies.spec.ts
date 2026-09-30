import type { Response } from 'express';
import { clearAuthCookies, COOKIES, setAuthCookies } from './auth-cookies';

const fakeResponse = () => ({ cookie: jest.fn(), clearCookie: jest.fn() });

describe('auth cookies', () => {
  const session = {
    accessToken: 'access.jwt',
    refreshToken: 'refresh-token',
    refreshExpiresAt: new Date(Date.now() + 30 * 86_400_000),
  };

  it('pose les cookies avec SameSite=Lax ; jetons en httpOnly, indicateur de session lisible', () => {
    const res = fakeResponse();
    setAuthCookies(res as unknown as Response, session);

    const byName = Object.fromEntries(res.cookie.mock.calls.map(([name, , opts]) => [name, opts]));
    for (const opts of Object.values(byName)) {
      expect(opts).toMatchObject({ sameSite: 'lax' });
    }
    // Les jetons ne sont jamais lisibles par du JavaScript (XSS) ; l'indicateur, lui, ne contient rien de secret.
    expect(byName[COOKIES.ACCESS].httpOnly).toBe(true);
    expect(byName[COOKIES.REFRESH].httpOnly).toBe(true);
    expect(byName[COOKIES.SESSION].httpOnly).toBe(false);
    expect(byName[COOKIES.ACCESS].path).toBe('/');
    // Le refresh token ne part qu'aux routes d'authentification.
    expect(byName[COOKIES.REFRESH].path).toBe('/api/auth');
    expect(byName[COOKIES.SESSION].path).toBe('/');
  });

  it('ne met jamais le refresh token dans le cookie indicateur de session', () => {
    const res = fakeResponse();
    setAuthCookies(res as unknown as Response, session);
    const sessionCall = res.cookie.mock.calls.find(([name]) => name === COOKIES.SESSION);
    expect(sessionCall?.[1]).toBe('1');
  });

  it('efface les trois cookies avec les mêmes chemins', () => {
    const res = fakeResponse();
    clearAuthCookies(res as unknown as Response);
    const cleared = Object.fromEntries(res.clearCookie.mock.calls.map(([n, o]) => [n, o.path]));
    expect(cleared).toEqual({
      [COOKIES.ACCESS]: '/',
      [COOKIES.REFRESH]: '/api/auth',
      [COOKIES.SESSION]: '/',
    });
  });
});
