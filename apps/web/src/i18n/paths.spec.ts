import { describe, expect, it } from 'vitest';
import { AUTH_LINK_PATHS, authLinkPath } from '@churchy/shared';
import { routing } from './routing';
import {
  localizeHref,
  localizeSearch,
  readQueryParam,
  splitLocale,
  toInternalPath,
  toLocalizedPath,
} from './paths';

describe('toLocalizedPath', () => {
  it('préfixe la langue et traduit les segments', () => {
    expect(toLocalizedPath('fr', '/paroisses/p1/messes')).toBe('/fr/paroisses/p1/messes');
    expect(toLocalizedPath('en', '/paroisses/p1/messes')).toBe('/en/parishes/p1/masses');
    expect(toLocalizedPath('en', '/paroisses/p1/messes/o1')).toBe('/en/parishes/p1/masses/o1');
  });

  it('la racine devient /fr ou /en', () => {
    expect(toLocalizedPath('fr', '/')).toBe('/fr');
    expect(toLocalizedPath('en', '/')).toBe('/en');
  });

  it('traduit les pages d’authentification et les pages statiques', () => {
    expect(toLocalizedPath('fr', '/login')).toBe('/fr/connexion');
    expect(toLocalizedPath('en', '/login')).toBe('/en/login');
    expect(toLocalizedPath('en', '/forgot-password')).toBe('/en/forgot-password');
    expect(toLocalizedPath('fr', '/forgot-password')).toBe('/fr/mot-de-passe-oublie');
    expect(toLocalizedPath('en', '/favoris')).toBe('/en/favorites');
    expect(toLocalizedPath('en', '/pour-les-paroisses')).toBe('/en/for-parishes');
    expect(toLocalizedPath('en', '/contact')).toBe('/en/contact');
  });

  it('un chemin inconnu est seulement préfixé', () => {
    expect(toLocalizedPath('en', '/inconnu/x')).toBe('/en/inconnu/x');
  });

  it('ignore une barre finale', () => {
    expect(toLocalizedPath('en', '/paroisses/')).toBe('/en/parishes');
  });
});

describe('toInternalPath', () => {
  it('retrouve le chemin interne depuis le chemin visible de la langue', () => {
    expect(toInternalPath('en', '/parishes/p1/masses')).toBe('/paroisses/p1/messes');
    expect(toInternalPath('fr', '/connexion')).toBe('/login');
    expect(toInternalPath('en', '/')).toBe('/');
  });

  it('refuse un chemin qui n’existe pas dans cette langue', () => {
    expect(toInternalPath('en', '/paroisses/p1/messes')).toBeNull();
    expect(toInternalPath('fr', '/parishes')).toBeNull();
  });
});

describe('splitLocale', () => {
  it('sépare le préfixe de langue', () => {
    expect(splitLocale('/en/parishes/p1')).toEqual({ locale: 'en', rest: '/parishes/p1' });
    expect(splitLocale('/fr')).toEqual({ locale: 'fr', rest: '/' });
    expect(splitLocale('/paroisses')).toEqual({ locale: null, rest: '/paroisses' });
    expect(splitLocale('/de/x')).toEqual({ locale: null, rest: '/de/x' });
  });
});

describe('localizeHref', () => {
  it('conserve la query et l’ancre', () => {
    expect(localizeHref('en', '/paroisses?q=douala&page=2')).toBe('/en/parishes?q=douala&page=2');
    expect(localizeHref('fr', '/paroisses/p1/calendrier?mois=2026-10#j3')).toBe(
      '/fr/paroisses/p1/calendrier?mois=2026-10#j3',
    );
  });

  it('traduit les paramètres de requête selon la langue', () => {
    expect(localizeHref('en', '/paroisses/p1/calendrier?mois=2026-10#j3')).toBe(
      '/en/parishes/p1/calendar?month=2026-10#j3',
    );
    expect(localizeHref('en', '/paroisses?q=a&page=2')).toBe('/en/parishes?q=a&page=2');
  });

  it('laisse intacts le tableau de bord, les URL externes et les ancres', () => {
    expect(localizeHref('en', '/dashboard/parishes/p1')).toBe('/dashboard/parishes/p1');
    expect(localizeHref('en', '/dashboard')).toBe('/dashboard');
    expect(localizeHref('en', 'https://example.com/paroisses')).toBe(
      'https://example.com/paroisses',
    );
    expect(localizeHref('en', '//evil.com')).toBe('//evil.com');
    expect(localizeHref('en', '#contenu')).toBe('#contenu');
    expect(localizeHref('en', 'mailto:a@b.fr')).toBe('mailto:a@b.fr');
  });

  it('« /dashboardx » n’est pas le tableau de bord', () => {
    expect(localizeHref('fr', '/dashboardx')).toBe('/fr/dashboardx');
  });
});

describe('liens des emails (@churchy/shared)', () => {
  it('suivent exactement les URL visibles du site (routing.pathnames)', () => {
    for (const [kind, byLocale] of Object.entries(AUTH_LINK_PATHS)) {
      const internal = `/${kind}` as keyof typeof routing.pathnames;
      expect(routing.pathnames[internal], kind).toEqual(byLocale);
      expect(authLinkPath(kind as keyof typeof AUTH_LINK_PATHS, 'en')).toBe(
        toLocalizedPath('en', internal),
      );
      expect(authLinkPath(kind as keyof typeof AUTH_LINK_PATHS, 'fr')).toBe(
        toLocalizedPath('fr', internal),
      );
    }
  });

  it('langue inconnue : français', () => {
    expect(authLinkPath('verify-email', 'zz')).toBe('/fr/verification-email');
  });
});

describe('paramètres de requête traduits', () => {
  it('localizeSearch renomme dans les deux sens et garde le reste', () => {
    expect(localizeSearch('en', '?mois=2026-10&q=a')).toBe('?month=2026-10&q=a');
    expect(localizeSearch('fr', '?month=2026-10&q=a')).toBe('?mois=2026-10&q=a');
    expect(localizeSearch('en', '?month=2026-10')).toBe('?month=2026-10');
    expect(localizeSearch('en', '')).toBe('');
    expect(localizeSearch('en', '?q=douala')).toBe('?q=douala');
  });

  it('readQueryParam lit le nom français comme l’anglais', () => {
    expect(readQueryParam({ mois: '2026-10' }, 'mois')).toBe('2026-10');
    expect(readQueryParam({ month: '2026-11' }, 'mois')).toBe('2026-11');
    expect(readQueryParam({}, 'mois')).toBeUndefined();
    expect(readQueryParam({ mois: ['a', 'b'] }, 'mois')).toBeUndefined();
  });
});
