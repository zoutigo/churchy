export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'pt', 'la'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE = 'fr';

export const MAX_TAGS_PER_CONTENT = 10;

/** Nombre maximal de paroisses favorites (visiteur anonyme comme compte connecté). */
export const MAX_FAVORITE_PARISHES = 10;

export const CELEBRATION_STEPS_SUNDAY_MASS = [
  { key: 'entrance', title: "Chant d'entrée", order: 1 },
  { key: 'kyrie', title: 'Kyrie', order: 2 },
  { key: 'gloria', title: 'Gloria', order: 3 },
  { key: 'first_reading', title: 'Première lecture', order: 4 },
  { key: 'psalm', title: 'Psaume', order: 5 },
  { key: 'gospel', title: 'Évangile', order: 6 },
  { key: 'homily', title: 'Homélie', order: 7 },
  { key: 'universal_prayer', title: 'Prière universelle', order: 8 },
  { key: 'offertory', title: 'Offertoire', order: 9 },
  { key: 'communion', title: 'Communion', order: 10 },
  { key: 'sending', title: 'Envoi', order: 11 },
] as const;

export const API_VERSION = 'v1';
export const API_PREFIX = 'api';
