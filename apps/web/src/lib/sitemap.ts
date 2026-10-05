import type { MetadataRoute } from 'next';
import { toLocalizedPath } from '@/i18n/paths';
import { DEFAULT_LOCALE, LOCALES, routing } from '@/i18n/routing';

/** Pages publiques sans paramètre, indexables (chemins internes). */
export const STATIC_PATHS = [
  '/',
  '/paroisses',
  '/pour-les-paroisses',
  '/a-propos',
  '/contact',
  '/conditions-generales',
  '/confidentialite',
  '/mentions-legales',
];

/** Pages du mini-site d'une paroisse (chemins internes, `[parishId]` à remplacer). */
const PARISH_PATHS = ['', '/messes', '/annonces', '/activites', '/calendrier'];

/** Pages privées ou sans intérêt pour un moteur de recherche (chemins internes). */
const PRIVATE_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/forgot-pin',
  '/reset-pin',
  '/favoris',
];

/** Une entrée par langue, chacune avec ses `hreflang` : les moteurs relient les deux versions. */
export function sitemapEntries(siteUrl: string, internalPaths: string[]): MetadataRoute.Sitemap {
  return internalPaths.flatMap((path) => {
    const languages: Record<string, string> = Object.fromEntries(
      LOCALES.map((l) => [l, `${siteUrl}${toLocalizedPath(l, path)}`]),
    );
    languages['x-default'] = languages[DEFAULT_LOCALE];
    return LOCALES.map((l) => ({
      url: languages[l],
      alternates: { languages },
    }));
  });
}

export const parishPaths = (parishId: string): string[] =>
  PARISH_PATHS.map((suffix) => `/paroisses/${encodeURIComponent(parishId)}${suffix}`);

/** Toutes les URL visibles (par langue) à ne pas faire explorer, pour `robots.txt`. */
export function disallowedPaths(): string[] {
  const hidden = PRIVATE_PATHS.filter((p) => p in routing.pathnames);
  return [
    '/api/',
    '/dashboard',
    ...hidden.flatMap((p) => LOCALES.map((l) => toLocalizedPath(l, p))),
  ];
}
