import { DEFAULT_LOCALE, routing, type Locale } from './routing';

/**
 * Conversion entre chemins internes (`/paroisses/12/messes`, ceux des dossiers de `app/[locale]`) et
 * chemins visibles par langue (`/en/parishes/12/masses`). Fonctions pures : le middleware les utilise
 * sans embarquer la navigation React de next-intl.
 */
type Pathnames = Record<string, string | Partial<Record<Locale, string>>>;
const pathnames = routing.pathnames as Pathnames;

const visibleTemplate = (internal: string, locale: Locale): string => {
  const entry = pathnames[internal];
  return typeof entry === 'string' ? entry : (entry?.[locale] ?? internal);
};

const toRegExp = (template: string): RegExp =>
  new RegExp(`^${template.replace(/\[[^/\]]+\]/g, '([^/]+)')}$`);

const fill = (template: string, values: string[]): string => {
  let i = 0;
  return template.replace(/\[[^/\]]+\]/g, () => values[i++] ?? '');
};

const normalize = (path: string): string => (path.length > 1 ? path.replace(/\/+$/, '') : path);

/** Chemin interne → chemin visible, avec préfixe de langue. Inconnu : simplement préfixé. */
export function toLocalizedPath(locale: Locale, internalPath: string): string {
  const path = normalize(internalPath);
  for (const internal of Object.keys(pathnames)) {
    const match = toRegExp(internal).exec(path);
    if (!match) continue;
    const visible = fill(visibleTemplate(internal, locale), match.slice(1));
    return visible === '/' ? `/${locale}` : `/${locale}${visible}`;
  }
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/** Chemin visible (sans préfixe de langue) → chemin interne, ou `null` s'il n'existe pas dans cette langue. */
export function toInternalPath(locale: Locale, visiblePath: string): string | null {
  const path = normalize(visiblePath);
  for (const internal of Object.keys(pathnames)) {
    const match = toRegExp(visibleTemplate(internal, locale)).exec(path);
    if (match) return fill(internal, match.slice(1));
  }
  return null;
}

/** Retire le préfixe de langue : `/en/parishes/1` → `{ locale: 'en', rest: '/parishes/1' }`. */
export function splitLocale(pathname: string): { locale: Locale | null; rest: string } {
  const [, first = '', ...others] = pathname.split('/');
  const locale = routing.locales.find((l) => l === first) ?? null;
  return locale ? { locale, rest: `/${others.join('/')}` } : { locale: null, rest: pathname };
}

/**
 * Adresse interne d'un lien (`/paroisses/12?q=a#x`) → adresse visible (`/en/parishes/12?q=a#x`).
 * Le tableau de bord (`/dashboard`, sans préfixe), les URL externes et les ancres restent tels quels.
 */
const UNPREFIXED = ['/dashboard'];

export function localizeHref(locale: Locale, href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const [, path = '', rest = ''] = /^([^?#]*)(.*)$/.exec(href) ?? [];
  if (UNPREFIXED.some((p) => path === p || path.startsWith(`${p}/`))) return href;
  return toLocalizedPath(locale, path) + rest;
}

export { DEFAULT_LOCALE };
