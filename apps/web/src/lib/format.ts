import { CelebrationType, type SheetStatus } from '@churchy/shared';

export const CELEBRATION_TYPE_LABELS: Record<CelebrationType, string> = {
  [CelebrationType.SUNDAY_MASS]: 'Messe dominicale',
  [CelebrationType.WEEKDAY_MASS]: 'Messe en semaine',
  [CelebrationType.WEDDING]: 'Mariage',
  [CelebrationType.BAPTISM]: 'Baptême',
  [CelebrationType.FUNERAL]: 'Funérailles',
  [CelebrationType.OTHER]: 'Célébration',
};

export const SHEET_STATUS_LABELS: Record<SheetStatus, string> = {
  AVAILABLE: 'Feuille disponible',
  IN_PREPARATION: 'Feuille en préparation',
};

/** `timeZone` n'est précisé que par les tests : en production, le fuseau du serveur s'applique. */
type Tz = { timeZone?: string };

const fmt = (iso: string, options: Intl.DateTimeFormatOptions, tz?: Tz) =>
  new Date(iso).toLocaleString('fr-FR', { ...options, ...tz });

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
