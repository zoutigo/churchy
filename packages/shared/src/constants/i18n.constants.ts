/** Langues de l'application (le Cameroun est bilingue). Le français est la langue par défaut. */
export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/**
 * Pages d'authentification jointes par un lien d'email : segment visible par langue (même table que
 * `pathnames` du web, vérifiée par un test). Le lien porte la langue du compte : `/en/reset-password`.
 */
export const AUTH_LINK_PATHS = {
  'reset-password': { fr: '/reinitialisation', en: '/reset-password' },
  'verify-email': { fr: '/verification-email', en: '/verify-email' },
} as const satisfies Record<string, Record<Locale, string>>;

export type AuthLinkKind = keyof typeof AUTH_LINK_PATHS;

/** Chemin visible d'une page de lien, préfixé par la langue (français si la langue est inconnue). */
export function authLinkPath(kind: AuthLinkKind, locale: unknown): string {
  const lang: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return `/${lang}${AUTH_LINK_PATHS[kind][lang]}`;
}
