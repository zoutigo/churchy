// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3200${path}`, cookie ? { headers: { cookie } } : undefined);
const SESSION = 'churchy_session=1';

const redirectTarget = (res: Response) =>
  res.headers.get('location') ? new URL(res.headers.get('location') as string) : null;

describe('middleware : session', () => {
  it('renvoie un visiteur sans session de /dashboard vers la connexion en mémorisant la page', () => {
    const res = middleware(request('/dashboard/parishes?x=1'));
    const target = redirectTarget(res);
    expect(res.status).toBe(307);
    expect(target?.pathname).toBe('/fr/connexion');
    expect(target?.searchParams.get('next')).toBe('/dashboard/parishes?x=1');
  });

  it('renvoie vers la connexion dans la langue du cookie', () => {
    const res = middleware(request('/dashboard', 'NEXT_LOCALE=en'));
    expect(redirectTarget(res)?.pathname).toBe('/en/login');
  });

  it('laisse passer quelqu’un qui a une session', () => {
    const res = middleware(request('/dashboard', SESSION));
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it.each([
    '/fr/connexion',
    '/fr/inscription',
    '/fr/mot-de-passe-oublie',
    '/en/login',
    '/en/register',
    '/en/forgot-password',
  ])('renvoie un utilisateur connecté de %s vers le dashboard', (path) => {
    const res = middleware(request(path, SESSION));
    expect(redirectTarget(res)?.pathname).toBe('/dashboard');
  });

  it('ne redirige pas /fr/connexion?expired=1 même avec un cookie périmé (évite une boucle)', () => {
    const res = middleware(request('/fr/connexion?expired=1', SESSION));
    expect(res.headers.get('location')).toBeNull();
  });

  it('laisse un visiteur anonyme accéder aux pages d’authentification', () => {
    for (const path of ['/fr/connexion', '/fr/inscription', '/en/forgot-password']) {
      expect(middleware(request(path)).headers.get('location')).toBeNull();
    }
  });

  it('une valeur de cookie autre que « 1 » n’ouvre pas l’accès', () => {
    const res = middleware(request('/dashboard', 'churchy_session=0'));
    expect(redirectTarget(res)?.pathname).toBe('/fr/connexion');
  });
});

describe('middleware : langue', () => {
  it('« / » mène au français par défaut, sans lire Accept-Language', () => {
    const req = new NextRequest('http://localhost:3200/', {
      headers: { 'accept-language': 'en-US,en;q=0.9' },
    });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(redirectTarget(res)?.pathname).toBe('/fr');
  });

  it('« / » respecte le choix mémorisé dans le cookie', () => {
    expect(redirectTarget(middleware(request('/', 'NEXT_LOCALE=en')))?.pathname).toBe('/en');
  });

  it('un cookie de langue inconnue est ignoré', () => {
    expect(redirectTarget(middleware(request('/', 'NEXT_LOCALE=de')))?.pathname).toBe('/fr');
  });

  it('une ancienne adresse sans préfixe est redirigée en 308, dans la langue préférée, query conservée', () => {
    const fr = middleware(request('/paroisses/p1/messes?x=1'));
    expect(fr.status).toBe(308);
    const target = redirectTarget(fr);
    expect(target?.pathname).toBe('/fr/paroisses/p1/messes');
    expect(target?.search).toBe('?x=1');

    const en = redirectTarget(middleware(request('/paroisses/p1/messes', 'NEXT_LOCALE=en')));
    expect(en?.pathname).toBe('/en/parishes/p1/masses');
  });

  it('les anciennes adresses d’authentification suivent aussi', () => {
    expect(redirectTarget(middleware(request('/login')))?.pathname).toBe('/fr/connexion');
    expect(redirectTarget(middleware(request('/login', 'NEXT_LOCALE=en')))?.pathname).toBe(
      '/en/login',
    );
  });

  it('une page préfixée est servie (pas de redirection vers une autre langue)', () => {
    const res = middleware(request('/en/parishes/p1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});
