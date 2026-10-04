import { DEFAULT_LOCALE, isLocale, type Locale } from './i18n.constants';
import { MAX_FAVORITE_PARISHES } from './business.constants';
import { MAX_OCCURRENCES_PER_REQUEST } from '../schedule';

/**
 * Messages d'erreur **stables** : les schémas Zod et l'API renvoient ces codes (jamais une phrase), et
 * chaque client les traduit dans la langue de l'utilisateur avec `errorText`. Un texte qui n'est pas un
 * code connu (ancien message, erreur imprévue) est affiché tel quel.
 */
const CATALOG = {
  // Validation des formulaires (schémas Zod)
  emailInvalid: { fr: 'Email invalide', en: 'Invalid email address' },
  passwordMin8: { fr: 'Minimum 8 caractères', en: 'At least 8 characters' },
  passwordRequired: { fr: 'Mot de passe requis', en: 'Password is required' },
  passwordsMismatch: {
    fr: 'Les mots de passe ne correspondent pas',
    en: 'Passwords do not match',
  },
  confirmPasswordRequired: {
    fr: 'Confirmez le mot de passe',
    en: 'Confirm the password',
  },
  firstNameRequired: { fr: 'Prénom requis', en: 'First name is required' },
  lastNameRequired: { fr: 'Nom requis', en: 'Last name is required' },
  tokenRequired: { fr: 'Jeton requis', en: 'Token is required' },
  nameRequired: { fr: 'Nom requis', en: 'Name is required' },
  nameMin2: { fr: 'Nom requis (min 2 caractères)', en: 'Name is required (at least 2 characters)' },
  titleRequired: { fr: 'Titre requis', en: 'Title is required' },
  titleMax150: { fr: '150 caractères maximum', en: '150 characters maximum' },
  keyRequired: { fr: 'Clé requise', en: 'Key is required' },
  stepsRequired: { fr: 'Ajoutez au moins une étape', en: 'Add at least one step' },
  contentRequired: { fr: 'Contenu requis', en: 'Content is required' },
  contentTooLarge: {
    fr: 'Contenu trop volumineux (images trop lourdes ?)',
    en: 'Content is too large (images too heavy?)',
  },
  descriptionRequired: { fr: 'Description requise', en: 'Description is required' },
  descriptionTooLong: { fr: 'Description trop longue', en: 'Description is too long' },
  dateInvalid: {
    fr: 'Date invalide (format AAAA-MM-JJ)',
    en: 'Invalid date (format YYYY-MM-DD)',
  },
  timeInvalid: { fr: 'Heure invalide (format HH:mm)', en: 'Invalid time (format HH:mm)' },
  dateTimeRequired: { fr: 'Date et heure requises', en: 'Date and time are required' },
  datesRequired: { fr: 'Au moins une date', en: 'At least one date' },
  weekdaysRequired: { fr: 'Choisissez au moins un jour', en: 'Choose at least one day' },
  endBeforeStart: { fr: 'La fin doit être après le début', en: 'The end must be after the start' },
  messageTooShort: {
    fr: 'Message trop court (min 10 caractères)',
    en: 'Message too short (at least 10 characters)',
  },
  urlInvalid: { fr: 'Adresse web invalide', en: 'Invalid web address' },
  urlInvalidHttp: {
    fr: 'Adresse web invalide (http ou https)',
    en: 'Invalid web address (http or https)',
  },
  timezoneInvalid: { fr: 'Fuseau horaire invalide', en: 'Invalid time zone' },
  cityRequired: { fr: 'Ville requise', en: 'City is required' },
  countryRequired: { fr: 'Pays requis', en: 'Country is required' },
  phoneInvalid: { fr: 'Numéro de téléphone invalide', en: 'Invalid phone number' },
  phoneIncomplete: { fr: 'Numéro incomplet', en: 'Incomplete phone number' },
  monthInvalid: { fr: 'Mois invalide (format AAAA-MM)', en: 'Invalid month (format YYYY-MM)' },
  monthOutOfRange: { fr: 'Mois hors limites', en: 'Month out of range' },
  // Planning
  scheduleEmpty: {
    fr: 'Aucune date ne correspond à ce planning',
    en: 'No date matches this schedule',
  },
  schedulePast: {
    fr: 'Impossible de programmer une date passée',
    en: 'Cannot schedule a date in the past',
  },
  scheduleTooFar: {
    fr: 'Impossible de programmer au-delà d’un an',
    en: 'Cannot schedule more than a year ahead',
  },
  scheduleTooMany: {
    fr: 'Trop de dates ({max} maximum)',
    en: 'Too many dates ({max} maximum)',
  },
  // Réponses de l'API
  parishNotFound: { fr: 'Paroisse introuvable', en: 'Parish not found' },
  templateNotFound: { fr: 'Modèle introuvable', en: 'Template not found' },
  sheetNotFound: { fr: 'Feuille introuvable', en: 'Sheet not found' },
  celebrationNotFound: { fr: 'Célébration introuvable', en: 'Celebration not found' },
  occurrenceNotFound: { fr: 'Date introuvable', en: 'Date not found' },
  stepNotFound: { fr: 'Étape introuvable', en: 'Step not found' },
  contentNotFound: { fr: 'Contenu introuvable', en: 'Content not found' },
  announcementNotFound: { fr: 'Annonce introuvable', en: 'Announcement not found' },
  activityNotFound: { fr: 'Activité introuvable', en: 'Activity not found' },
  memberNotFound: { fr: 'Membre introuvable', en: 'Member not found' },
  userNotFound: { fr: 'Utilisateur introuvable', en: 'User not found' },
  userNotFoundByEmail: {
    fr: 'Utilisateur introuvable avec cet email',
    en: 'No user found with this email',
  },
  resourceNotFound: { fr: 'Ressource introuvable', en: 'Resource not found' },
  sessionExpired: { fr: 'Session expirée', en: 'Session expired' },
  sessionInvalid: { fr: 'Session invalide', en: 'Invalid session' },
  sessionMissing: { fr: 'Session absente', en: 'No session' },
  invalidCredentials: { fr: 'Identifiants invalides', en: 'Invalid credentials' },
  accessDenied: { fr: 'Accès refusé', en: 'Access denied' },
  parishAccessDenied: {
    fr: 'Accès refusé pour cette paroisse',
    en: 'Access denied for this parish',
  },
  creatorOnlyEdit: {
    fr: 'Seul le créateur peut modifier ce contenu',
    en: 'Only the creator can edit this content',
  },
  creatorOnlyDelete: {
    fr: 'Seul le créateur peut supprimer ce contenu',
    en: 'Only the creator can delete this content',
  },
  linkInvalidOrExpired: { fr: 'Lien invalide ou expiré', en: 'Invalid or expired link' },
  emailAlreadyUsed: { fr: 'Email déjà utilisé', en: 'Email already in use' },
  alreadyMember: { fr: 'Cet utilisateur est déjà membre', en: 'This user is already a member' },
  seriesAlreadyHasDate: {
    fr: 'Cette série a déjà une date à ce moment',
    en: 'This series already has a date at that time',
  },
  occurrencePast: {
    fr: 'Cette date est passée : elle ne peut plus être modifiée',
    en: 'This date is in the past: it can no longer be changed',
  },
  occurrenceCancelled: { fr: 'Cette date est annulée', en: 'This date is cancelled' },
  seriesArchived: { fr: 'Cette série est archivée', en: 'This series is archived' },
  sheetAlreadyExists: {
    fr: 'Cette date a déjà une feuille : utilisez « changer de modèle »',
    en: 'This date already has a sheet: use “change template”',
  },
  sheetNotPublished: { fr: 'Feuille non publiée', en: 'Sheet not published' },
  sheetAlreadyPublished: { fr: 'Feuille déjà publiée', en: 'Sheet already published' },
  stepsListMismatch: {
    fr: 'La liste doit contenir exactement les étapes de la feuille',
    en: 'The list must contain exactly the sheet’s steps',
  },
  stepDuplicate: { fr: 'Étape en double', en: 'Duplicate step' },
  stepUnknownForTemplate: {
    fr: 'Étape inconnue pour ce modèle',
    en: 'Unknown step for this template',
  },
  stepInUse: {
    fr: 'Cette étape est utilisée par des célébrations et ne peut pas être supprimée',
    en: 'This step is used by celebrations and cannot be deleted',
  },
  favoritesLimit: {
    fr: 'Vous pouvez avoir {max} paroisses favorites au maximum',
    en: 'You can have at most {max} favourite parishes',
  },
  // Client
  networkUnreachable: {
    fr: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
    en: 'Unable to reach the server. Check your connection.',
  },
  unknownError: { fr: 'Erreur inconnue', en: 'Unknown error' },
  fixFields: {
    fr: 'Corrigez les champs signalés en rouge.',
    en: 'Fix the fields marked in red.',
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type ErrorCode = keyof typeof CATALOG;

/** `ERR.emailInvalid === 'emailInvalid'` : un code, avec complétion et vérification de frappe. */
export const ERR = Object.fromEntries(Object.keys(CATALOG).map((k) => [k, k])) as {
  [K in ErrorCode]: K;
};

export const ERROR_CODES = Object.keys(CATALOG) as ErrorCode[];

export const isErrorCode = (value: unknown): value is ErrorCode =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(CATALOG, value);

/**
 * Texte d'un message d'erreur dans la langue demandée. Un code connu est traduit ; tout autre texte est
 * rendu tel quel (message déjà lisible, erreur imprévue).
 */
export function errorText(message: string, locale: string = DEFAULT_LOCALE): string {
  if (!isErrorCode(message)) return message;
  const lang: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const max = message === 'favoritesLimit' ? MAX_FAVORITE_PARISHES : MAX_OCCURRENCES_PER_REQUEST;
  return CATALOG[message][lang].replace('{max}', String(max));
}
