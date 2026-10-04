/**
 * Téléphone d'une paroisse : format du pays (indicatif, nombre de chiffres, regroupement) pour aider la
 * saisie (masque + exemple) et produire un numéro international cliquable (`tel:`) pour les visiteurs.
 * Les pays absents de la liste restent en saisie libre, au format international.
 */
export interface PhoneFormat {
  /** Indicatif international, avec le « + ». */
  dial: string;
  /** Regroupement des chiffres du numéro national (leur somme = nombre de chiffres attendus). */
  groups: readonly number[];
  /** Exemple de numéro national, déjà masqué : sert de placeholder. */
  example: string;
}

const fmt = (dial: string, groups: readonly number[], example: string): PhoneFormat => ({
  dial,
  groups,
  example,
});

export const PHONE_FORMATS: Record<string, PhoneFormat> = {
  Cameroun: fmt('+237', [1, 2, 2, 2, 2], '6 77 12 34 56'),
  France: fmt('+33', [1, 2, 2, 2, 2], '6 12 34 56 78'),
  Belgique: fmt('+32', [3, 2, 2, 2], '470 12 34 56'),
  Suisse: fmt('+41', [2, 3, 2, 2], '79 123 45 67'),
  Luxembourg: fmt('+352', [3, 3, 3], '621 123 456'),
  Canada: fmt('+1', [3, 3, 4], '514 123 4567'),
  'États-Unis': fmt('+1', [3, 3, 4], '212 123 4567'),
  Gabon: fmt('+241', [2, 2, 2, 2], '06 12 34 56'),
  Congo: fmt('+242', [2, 3, 4], '06 123 4567'),
  'République démocratique du Congo': fmt('+243', [3, 3, 3], '812 345 678'),
  Tchad: fmt('+235', [2, 2, 2, 2], '66 12 34 56'),
  Centrafrique: fmt('+236', [2, 2, 2, 2], '70 12 34 56'),
  'Guinée équatoriale': fmt('+240', [3, 3, 3], '222 123 456'),
  "Côte d'Ivoire": fmt('+225', [2, 2, 2, 2, 2], '07 12 34 56 78'),
  Sénégal: fmt('+221', [2, 3, 2, 2], '77 123 45 67'),
  Bénin: fmt('+229', [2, 2, 2, 2], '97 12 34 56'),
  Togo: fmt('+228', [2, 2, 2, 2], '90 12 34 56'),
};

/** Format du pays, ou `undefined` si le pays n'a pas de format connu (saisie libre). */
export const phoneFormatOf = (country: string | undefined | null): PhoneFormat | undefined =>
  country ? PHONE_FORMATS[country] : undefined;

const digitsOf = (s: string) => s.replace(/\D/g, '');
const expectedDigits = (f: PhoneFormat) => f.groups.reduce((a, b) => a + b, 0);

/** Regroupe des chiffres selon le format (« 677123456 » → « 6 77 12 34 56 »), en s'arrêtant au dernier chiffre saisi. */
function group(digits: string, groups: readonly number[]): string {
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  return parts.join(' ');
}

/**
 * Masque de saisie : ne garde que les chiffres, retire l'indicatif ou le « 0 » de tête que l'on tape
 * par habitude (et que l'on ne compose pas depuis l'étranger), limite à la longueur attendue.
 */
export function maskNationalPhone(country: string, input: string): string {
  const f = phoneFormatOf(country);
  if (!f) return input;
  let digits = digitsOf(input);
  const dial = digitsOf(f.dial);
  if (input.trim().startsWith('+') || input.trim().startsWith('00')) {
    digits = digits.replace(/^(00)?/, '');
    if (digits.startsWith(dial)) digits = digits.slice(dial.length);
  }
  if (country === 'France' || country === 'Belgique' || country === 'Suisse') {
    digits = digits.replace(/^0/, '');
  }
  return group(digits.slice(0, expectedDigits(f)), f.groups);
}

/** Valeur enregistrée : « +237 6 77 12 34 56 » (vide si rien n'est saisi). */
export function toStoredPhone(country: string, national: string): string {
  const f = phoneFormatOf(country);
  const masked = maskNationalPhone(country, national);
  if (!f || !masked) return f ? '' : national.trim();
  return `${f.dial} ${masked}`;
}

/** Partie nationale (masquée) d'un numéro enregistré, pour le champ de saisie. */
export function nationalPhoneOf(country: string, stored: string | null | undefined): string {
  if (!stored) return '';
  const f = phoneFormatOf(country);
  if (!f) return stored;
  return maskNationalPhone(country, stored.trim().startsWith('+') ? stored : `${f.dial}${stored}`);
}

/** Vrai si le numéro est complet pour le pays (toujours vrai pour un pays sans format). */
export function isCompletePhone(country: string, stored: string | null | undefined): boolean {
  if (!stored) return true;
  const f = phoneFormatOf(country);
  if (!f) return true;
  return digitsOf(nationalPhoneOf(country, stored)).length === expectedDigits(f);
}

/** Texte d'aide : « Ex. +237 6 77 12 34 56 » ou, sans format connu, « Format international, ex. +33 1 23 45 67 89 ». */
export function phonePlaceholder(country: string | undefined | null): string {
  const f = phoneFormatOf(country);
  return f ? f.example : '+33 1 23 45 67 89';
}
