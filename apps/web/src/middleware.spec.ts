// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3200${path}`, cookie ? { headers: { cookie } } : undefined);
const SESSION = 'churchy_session=1';

const redirectTarget = (res: Response) =>
  res.headers.get('location') ? new URL(res.headers.get('location') as string) : null;

describe('middleware', () => {
  it('renvoie un visiteur sans session de /dashboard vers /login en mémorisant la page', () => {
    const res = middleware(request('/dashboard/parishes?x=1'));
    const target = redirectTarget(res);
    expect(res.status).toBe(307);
    expect(target?.pathname).toBe('/login');
    expect(target?.searchParams.get('next')).toBe('/dashboard/parishes?x=1');
  });

  it('laisse passer quelqu’un qui a une session', () => {
    const res = middleware(request('/dashboard', SESSION));
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it.each(['/login', '/register', '/forgot-password'])(
    'renvoie un utilisateur connecté de %s vers le dashboard',
    (path) => {
      const res = middleware(request(path, SESSION));
      expect(redirectTarget(res)?.pathname).toBe('/dashboard');
    },
  );

  it('ne redirige pas /login?expired=1 même avec un cookie périmé (évite une boucle)', () => {
    const res = middleware(request('/login?expired=1', SESSION));
    expect(res.headers.get('location')).toBeNull();
  });

  it('laisse un visiteur anonyme accéder aux pages d’authentification', () => {
    for (const path of ['/login', '/register', '/forgot-password']) {
      expect(middleware(request(path)).headers.get('location')).toBeNull();
    }
  });

  it('une valeur de cookie autre que « 1 » n’ouvre pas l’accès', () => {
    const res = middleware(request('/dashboard', 'churchy_session=0'));
    expect(redirectTarget(res)?.pathname).toBe('/login');
  });
});
