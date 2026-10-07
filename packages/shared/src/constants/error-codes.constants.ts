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
  memberUpdateEmpty: {
    fr: 'Aucune modification demandée',
    en: 'No change requested',
  },
  dutyNeedsParishioner: {
    fr: 'Une responsabilité ne se donne qu’à un paroissien',
    en: 'A duty can only be given to a parishioner',
  },
  parishLastAdmin: {
    fr: 'Une paroisse doit garder au moins un administrateur',
    en: 'A parish must keep at least one administrator',
  },
  parishFollowLimit: {
    fr: 'Vous suivez déjà le nombre maximum de paroisses',
    en: 'You already follow the maximum number of parishes',
  },
  notFollowing: { fr: 'Vous ne suivez pas cette paroisse', en: 'You do not follow this parish' },
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
  // Connexion par téléphone + PIN, Google, sécurité du compte
  phoneRequired: { fr: 'Numéro de téléphone requis', en: 'Phone number is required' },
  phoneAlreadyUsed: {
    fr: 'Ce numéro est déjà utilisé',
    en: 'This phone number is already in use',
  },
  pinRequired: { fr: 'Code PIN requis', en: 'PIN is required' },
  pinInvalid: {
    fr: 'Le PIN doit contenir exactement 6 chiffres',
    en: 'The PIN must be exactly 6 digits',
  },
  pinTooWeak: {
    fr: 'PIN trop simple (évitez 123456 ou 000000)',
    en: 'PIN is too simple (avoid 123456 or 000000)',
  },
  confirmPinRequired: { fr: 'Confirmez le PIN', en: 'Confirm the PIN' },
  pinsMismatch: { fr: 'Les PIN ne correspondent pas', en: 'PINs do not match' },
  tooManyAttempts: {
    fr: 'Trop de tentatives. Réessayez dans quelques minutes.',
    en: 'Too many attempts. Try again in a few minutes.',
  },
  currentSecretRequired: {
    fr: 'Saisissez votre mot de passe ou votre PIN actuel',
    en: 'Enter your current password or PIN',
  },
  currentSecretInvalid: {
    fr: 'Mot de passe ou PIN actuel incorrect',
    en: 'Current password or PIN is incorrect',
  },
  pinAlreadySet: {
    fr: 'Un PIN est déjà défini sur ce compte',
    en: 'A PIN is already set on this account',
  },
  noPinSet: { fr: "Aucun PIN n'est défini sur ce compte", en: 'No PIN is set on this account' },
  emailRequired: {
    fr: "Ajoutez d'abord une adresse email à votre compte",
    en: 'Add an email address to your account first',
  },
  emailAlreadySet: {
    fr: 'Ce compte a déjà une adresse email',
    en: 'This account already has an email address',
  },
  lastLoginMethod: {
    fr: 'Impossible : ce serait votre dernier moyen de connexion',
    en: 'Not possible: this is your last sign-in method',
  },
  googleNotConfigured: {
    fr: "La connexion avec Google n'est pas disponible",
    en: 'Sign-in with Google is not available',
  },
  googleTokenInvalid: {
    fr: 'Connexion Google refusée. Réessayez.',
    en: 'Google sign-in was rejected. Try again.',
  },
  googleEmailUnverified: {
    fr: "L'adresse email de ce compte Google n'est pas vérifiée",
    en: "This Google account's email address is not verified",
  },
  googleAlreadyLinked: {
    fr: 'Un compte Google est déjà lié',
    en: 'A Google account is already linked',
  },
  googleLinkedElsewhere: {
    fr: 'Ce compte Google est déjà lié à un autre compte Churchy',
    en: 'This Google account is already linked to another Churchy account',
  },
  googleNotLinked: { fr: "Aucun compte Google n'est lié", en: 'No Google account is linked' },
  googleLinkLoginFirst: {
    fr: "Un compte existe déjà avec cet email mais sans mot de passe : connectez-vous d'abord par votre autre moyen, puis liez Google depuis « Sécurité ».",
    en: 'An account already exists with this email but has no password: sign in with your other method first, then link Google from "Security".',
  },
  forbiddenPlatform: {
    fr: 'Réservé aux administrateurs de la plateforme',
    en: 'Reserved for platform administrators',
  },
  accountSuspended: {
    fr: 'Ce compte est suspendu',
    en: 'This account is suspended',
  },
  platformRoleForbidden: {
    fr: "Vous n'avez pas le droit de modifier ce rôle",
    en: 'You are not allowed to change this role',
  },
  platformLastSuperAdmin: {
    fr: 'Impossible : il doit rester au moins un super administrateur',
    en: 'Not possible: at least one super administrator must remain',
  },
  platformSuspendForbidden: {
    fr: "Vous n'avez pas le droit de suspendre ce compte",
    en: 'You are not allowed to suspend this account',
  },
  platformUserNotFound: { fr: 'Compte introuvable', en: 'Account not found' },
  userNotFoundByPhone: {
    fr: 'Aucun compte avec ce numéro',
    en: 'No account with this phone number',
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
