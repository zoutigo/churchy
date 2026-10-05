import { describe, expect, it } from 'vitest';
import { disallowedPaths, parishPaths, sitemapEntries, STATIC_PATHS } from './sitemap';
import { toLocalizedPath } from '@/i18n/paths';

describe('sitemapEntries', () => {
  const entries = sitemapEntries('https://x.test', ['/', '/paroisses/p1/messes']);

  it('publie chaque page dans les deux langues, avec des URL absolues traduites', () => {
    expect(entries.map((e) => e.url)).toEqual([
      'https://x.test/fr',
      'https://x.test/en',
      'https://x.test/fr/paroisses/p1/messes',
      'https://x.test/en/parishes/p1/masses',
    ]);
  });

  it('relie les deux versions par hreflang, x-default = français', () => {
    expect(entries[3].alternates?.languages).toEqual({
      fr: 'https://x.test/fr/paroisses/p1/messes',
      en: 'https://x.test/en/parishes/p1/masses',
      'x-default': 'https://x.test/fr/paroisses/p1/messes',
    });
    expect(entries[2].alternates).toEqual(entries[3].alternates);
  });

  it('les pages statiques existent toutes dans les deux langues', () => {
    for (const path of STATIC_PATHS) {
      expect(toLocalizedPath('fr', path)).toMatch(/^\/fr/);
      expect(toLocalizedPath('en', path)).toMatch(/^\/en/);
    }
    expect(sitemapEntries('https://x.test', STATIC_PATHS)).toHaveLength(STATIC_PATHS.length * 2);
  });
});

describe('parishPaths', () => {
  it('liste l’accueil, les messes, annonces, activités et le calendrier, id encodé', () => {
    expect(parishPaths('a b')).toEqual([
      '/paroisses/a%20b',
      '/paroisses/a%20b/messes',
      '/paroisses/a%20b/annonces',
      '/paroisses/a%20b/activites',
      '/paroisses/a%20b/calendrier',
    ]);
  });
});

describe('disallowedPaths', () => {
  const paths = disallowedPaths();

  it('exclut l’API, le tableau de bord et les pages d’authentification dans chaque langue', () => {
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/',
        '/dashboard',
        '/fr/connexion',
        '/en/login',
        '/fr/inscription',
        '/en/register',
        '/fr/mot-de-passe-oublie',
        '/en/reset-password',
        '/fr/favoris',
        '/en/favorites',
        '/fr/pin-oublie',
        '/en/forgot-pin',
        '/fr/reinitialisation-pin',
        '/en/reset-pin',
      ]),
    );
  });

  it('n’exclut aucune page du plan du site', () => {
    for (const path of STATIC_PATHS) {
      for (const l of ['fr', 'en'] as const) {
        const url = toLocalizedPath(l, path);
        expect(paths.some((d) => url === d || url.startsWith(`${d}/`))).toBe(false);
      }
    }
  });
});
