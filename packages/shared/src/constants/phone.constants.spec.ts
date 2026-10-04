import { describe, expect, it } from 'vitest';
import {
  isCompletePhone,
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
