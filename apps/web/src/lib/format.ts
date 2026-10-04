import type { Locale } from '@churchy/shared';

/**
 * `timeZone` : fuseau d'affichage (celui de la paroisse ; le fuseau du serveur à défaut).
 * `locale` : langue de l'interface (`fr` par défaut).
 */
type Tz = { timeZone?: string; locale?: Locale };

/** Langue d'affichage des dates : l'anglais du Cameroun suit l'usage britannique (jour avant le mois). */
const INTL_LOCALES: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB' };

const fmt = (iso: string, options: Intl.DateTimeFormatOptions, tz?: Tz) =>
  new Date(iso).toLocaleString(INTL_LOCALES[tz?.locale ?? 'fr'], {
    ...options,
    ...(tz?.timeZone ? { timeZone: tz.timeZone } : {}),
  });

/** « dimanche 4 octobre 2026 » */
export const formatDateLong = (iso: string, tz?: Tz) =>
  fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, tz);

/** « 10:30 » */
export const formatTime = (iso: string, tz?: Tz) =>
  fmt(iso, { hour: '2-digit', minute: '2-digit', hour12: false }, tz);

/** « dim. 4 oct. » */
export const formatDateShort = (iso: string, tz?: Tz) =>
  fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' }, tz);

/** Éléments du bloc-date des cartes : « dim. », « 4 », « oct. » */
export function formatDateParts(iso: string, tz?: Tz) {
  return {
    weekday: fmt(iso, { weekday: 'short' }, tz),
    day: fmt(iso, { day: 'numeric' }, tz),
    month: fmt(iso, { month: 'short' }, tz),
  };
}

/** Ville, avec le quartier s'il est connu : « Bastos, Yaoundé ». */
export const placeLabel = (p: { city: string; district?: string | null }) =>
  p.district ? `${p.district}, ${p.city}` : p.city;

/** Numéro de téléphone utilisable dans un lien `tel:`. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** « dimanche 4 octobre 2026 à 10:30 » (« Sunday 4 October 2026 at 10:30 ») dans le fuseau de la paroisse. */
export const formatDateTimeLong = (iso: string, tz?: Tz) =>
  `${formatDateLong(iso, tz)} ${tz?.locale === 'en' ? 'at' : 'à'} ${formatTime(iso, tz)}`;

/** Jours de la semaine, du lundi au dimanche, avec le numéro attendu par l'API (0 = dimanche). Noms : `weekdays.*`. */
export const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const;
