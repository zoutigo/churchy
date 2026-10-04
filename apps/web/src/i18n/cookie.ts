import { LOCALE_COOKIE, type Locale } from './routing';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Mémorise la langue dans le navigateur : le serveur la lit pour le tableau de bord et pour `/`. */
export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

export function readLocaleCookie(
  cookies: string = typeof document === 'undefined' ? '' : document.cookie,
): string | null {
  const entry = cookies.split(';').find((c) => c.trim().startsWith(`${LOCALE_COOKIE}=`));
  return entry ? entry.trim().slice(LOCALE_COOKIE.length + 1) : null;
}
