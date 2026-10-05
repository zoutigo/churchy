import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@churchy/shared';

export { DEFAULT_LOCALE, LOCALES, isLocale };
export type { Locale };

/** Cookie de langue : lu par le serveur (le localStorage ne l'est pas). Un an. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Les clés sont les chemins **internes** (les dossiers de `app/[locale]`) ; les valeurs sont les URL
 * visibles. Le site public et l'authentification sont préfixés par la langue ; le tableau de bord
 * (`/dashboard`) n'en a pas : il est privé et sa langue vient du compte.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  // Le français est la langue par défaut : on ne se fie pas à Accept-Language (voir middleware.ts).
  localeDetection: false,
  localeCookie: { name: LOCALE_COOKIE, maxAge: ONE_YEAR, sameSite: 'lax' },
  pathnames: {
    '/': '/',
    '/paroisses': { fr: '/paroisses', en: '/parishes' },
    '/paroisses/[parishId]': { fr: '/paroisses/[parishId]', en: '/parishes/[parishId]' },
    '/paroisses/[parishId]/messes': {
      fr: '/paroisses/[parishId]/messes',
      en: '/parishes/[parishId]/masses',
    },
    '/paroisses/[parishId]/messes/[celebrationId]': {
      fr: '/paroisses/[parishId]/messes/[celebrationId]',
      en: '/parishes/[parishId]/masses/[celebrationId]',
    },
    '/paroisses/[parishId]/annonces': {
      fr: '/paroisses/[parishId]/annonces',
      en: '/parishes/[parishId]/announcements',
    },
    '/paroisses/[parishId]/activites': {
      fr: '/paroisses/[parishId]/activites',
      en: '/parishes/[parishId]/activities',
    },
    '/paroisses/[parishId]/calendrier': {
      fr: '/paroisses/[parishId]/calendrier',
      en: '/parishes/[parishId]/calendar',
    },
    '/favoris': { fr: '/favoris', en: '/favorites' },
    '/pour-les-paroisses': { fr: '/pour-les-paroisses', en: '/for-parishes' },
    '/a-propos': { fr: '/a-propos', en: '/about' },
    '/contact': '/contact',
    '/conditions-generales': { fr: '/conditions-generales', en: '/terms' },
    '/confidentialite': { fr: '/confidentialite', en: '/privacy' },
    '/mentions-legales': { fr: '/mentions-legales', en: '/legal-notice' },
    '/login': { fr: '/connexion', en: '/login' },
    '/register': { fr: '/inscription', en: '/register' },
    '/forgot-password': { fr: '/mot-de-passe-oublie', en: '/forgot-password' },
    '/reset-password': { fr: '/reinitialisation', en: '/reset-password' },
    '/verify-email': { fr: '/verification-email', en: '/verify-email' },
    '/forgot-pin': { fr: '/pin-oublie', en: '/forgot-pin' },
    '/reset-pin': { fr: '/reinitialisation-pin', en: '/reset-pin' },
  },
});
