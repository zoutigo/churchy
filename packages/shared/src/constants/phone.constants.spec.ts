import { describe, expect, it } from 'vitest';
import {
  formatInternationalPhone,
  isCompletePhone,
  isValidInternationalPhone,
  maskPhoneForLogs,
  normalizeInternationalPhone,
  maskNationalPhone,
  nationalPhoneOf,
  phoneFormatOf,
  phonePlaceholder,
  toStoredPhone,
} from './phone.constants';

describe('téléphone par pays', () => {
  it('masque la saisie au format du Cameroun (9 chiffres) et ignore le reste', () => {
    expect(maskNationalPhone('Cameroun', '677123456')).toBe('6 77 12 34 56');
    expect(maskNationalPhone('Cameroun', '6 77 12')).toBe('6 77 12');
    expect(maskNationalPhone('Cameroun', '67a7-12.34 5678999')).toBe('6 77 12 34 56');
  });

  it('retire l’indicatif tapé (+237 ou 00237) et le 0 de tête en France', () => {
    expect(maskNationalPhone('Cameroun', '+237 677123456')).toBe('6 77 12 34 56');
    expect(maskNationalPhone('Cameroun', '00237677123456')).toBe('6 77 12 34 56');
    expect(maskNationalPhone('France', '0612345678')).toBe('6 12 34 56 78');
    expect(maskNationalPhone('France', '+33 6 12 34 56 78')).toBe('6 12 34 56 78');
  });

  it('enregistre au format international, vide si rien n’est saisi', () => {
    expect(toStoredPhone('Cameroun', '677123456')).toBe('+237 6 77 12 34 56');
    expect(toStoredPhone('Cameroun', '')).toBe('');
    expect(toStoredPhone('Cameroun', 'abc')).toBe('');
  });

  it('relit un numéro enregistré, y compris une ancienne saisie nationale', () => {
    expect(nationalPhoneOf('Cameroun', '+237 6 77 12 34 56')).toBe('6 77 12 34 56');
    expect(nationalPhoneOf('France', '04 00 00 00 00')).toBe('4 00 00 00 00');
    expect(nationalPhoneOf('Cameroun', null)).toBe('');
  });

  it('détecte un numéro incomplet', () => {
    expect(isCompletePhone('Cameroun', '+237 6 77 12')).toBe(false);
    expect(isCompletePhone('Cameroun', '+237 6 77 12 34 56')).toBe(true);
    expect(isCompletePhone('Cameroun', '')).toBe(true);
  });

  it('laisse libre un pays sans format connu', () => {
    expect(phoneFormatOf('Portugal')).toBeUndefined();
    expect(maskNationalPhone('Portugal', '+351 21 123 4567')).toBe('+351 21 123 4567');
    expect(toStoredPhone('Portugal', ' +351 21 123 4567 ')).toBe('+351 21 123 4567');
    expect(isCompletePhone('Portugal', '12')).toBe(true);
  });

  it('donne un exemple du pays pour le placeholder', () => {
    expect(phonePlaceholder('Cameroun')).toBe('6 77 12 34 56');
    expect(phonePlaceholder('Portugal')).toMatch(/^\+/);
  });
});

describe('numéro de compte (E.164)', () => {
  it('normalise : espaces, points, tirets, parenthèses ignorés ; « 00 » devient « + »', () => {
    expect(normalizeInternationalPhone('+237 6 77 12 34 56')).toBe('+237677123456');
    expect(normalizeInternationalPhone(' 00237.677-12 34 56 ')).toBe('+237677123456');
    expect(normalizeInternationalPhone('+33 (0)6 12 34 56 78')).toBe('+330612345678');
  });

  it('refuse (chaîne vide) un numéro sans indicatif', () => {
    expect(normalizeInternationalPhone('677123456')).toBe('');
    expect(normalizeInternationalPhone('0677123456')).toBe('');
    expect(normalizeInternationalPhone('')).toBe('');
  });

  it('valide un numéro complet d’un pays connu', () => {
    expect(isValidInternationalPhone('+237677123456')).toBe(true);
    expect(isValidInternationalPhone('+33612345678')).toBe(true);
    expect(isValidInternationalPhone('+14165551234')).toBe(true);
  });

  it('refuse un numéro incomplet ou trop long pour son pays', () => {
    expect(isValidInternationalPhone('+23767712345')).toBe(false);
    expect(isValidInternationalPhone('+2376771234567')).toBe(false);
    expect(isValidInternationalPhone('+3361234567')).toBe(false);
  });

  it('accepte un pays sans format connu si la longueur est plausible', () => {
    expect(isValidInternationalPhone('+4915112345678')).toBe(true);
  });

  it('refuse ce qui n’est pas un numéro', () => {
    expect(isValidInternationalPhone('')).toBe(false);
    expect(isValidInternationalPhone('+0123456789')).toBe(false);
    expect(isValidInternationalPhone('+12345')).toBe(false);
    expect(isValidInternationalPhone('+1234567890123456')).toBe(false);
    expect(isValidInternationalPhone('237677123456')).toBe(false);
    expect(isValidInternationalPhone('+237abc')).toBe(false);
  });

  it('distingue les indicatifs proches (+242 Congo, +243 RDC)', () => {
    expect(isValidInternationalPhone('+242061234567')).toBe(true);
    expect(isValidInternationalPhone('+243812345678')).toBe(true);
    expect(isValidInternationalPhone('+24381234567')).toBe(false);
  });

  it('présente un numéro au format du pays, tel quel sinon', () => {
    expect(formatInternationalPhone('+237677123456')).toBe('+237 6 77 12 34 56');
    expect(formatInternationalPhone('+4915112345678')).toBe('+4915112345678');
    expect(formatInternationalPhone('pas un numéro')).toBe('pas un numéro');
  });

  it('masque le numéro pour les journaux', () => {
    expect(maskPhoneForLogs('+237677123456')).toBe('+237•••56');
    expect(maskPhoneForLogs('+237677123456')).not.toContain('677123');
    expect(maskPhoneForLogs('+1')).toBe('••••');
  });
});
