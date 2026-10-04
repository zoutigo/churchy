import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './routing';

/**
 * Langue d'une requête : celle de l'URL pour le site public (`/fr/…`, `/en/…`) ; pour le tableau de bord,
 * qui n'a pas de préfixe, le cookie de langue (tenu à jour avec le compte), sinon le français.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const fromUrl = await requestLocale;
  const fromCookie = cookies().get(LOCALE_COOKIE)?.value;
  const locale = isLocale(fromUrl) ? fromUrl : isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
