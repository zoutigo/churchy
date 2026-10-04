import { describe, expect, it } from 'vitest';
import {
  ERR,
  ERROR_CODES,
  MAX_FAVORITE_PARISHES,
  MAX_OCCURRENCES_PER_REQUEST,
  SCHEDULE_WINDOW_MESSAGES,
  createParishSchema,
  errorText,
  isErrorCode,
  loginSchema,
} from '..';

describe('errorText', () => {
  it('traduit un code dans la langue demandée', () => {
    expect(errorText(ERR.parishNotFound, 'fr')).toBe('Paroisse introuvable');
    expect(errorText(ERR.parishNotFound, 'en')).toBe('Parish not found');
  });

  it('français par défaut, et pour une langue inconnue', () => {
    expect(errorText(ERR.emailInvalid)).toBe('Email invalide');
    expect(errorText(ERR.emailInvalid, 'zz')).toBe('Email invalide');
  });

  it('un texte qui n’est pas un code est rendu tel quel', () => {
    expect(errorText('Internal server error', 'en')).toBe('Internal server error');
    expect(errorText('toString', 'en')).toBe('toString');
  });

  it('remplit les valeurs variables', () => {
    expect(errorText(ERR.favoritesLimit, 'en')).toContain(String(MAX_FAVORITE_PARISHES));
    expect(errorText(ERR.scheduleTooMany, 'fr')).toContain(String(MAX_OCCURRENCES_PER_REQUEST));
  });

  it('chaque code a un texte français et anglais, sans accolade oubliée', () => {
    for (const code of ERROR_CODES) {
      for (const lang of ['fr', 'en']) {
        const text = errorText(code, lang);
        expect(text.length, `${code} (${lang})`).toBeGreaterThan(0);
        expect(text, `${code} (${lang})`).not.toMatch(/[{}]/);
      }
      expect(errorText(code, 'en'), code).not.toBe(errorText(code, 'fr'));
    }
  });
});

describe('codes dans les schémas et les plannings', () => {
  it('les schémas Zod renvoient des codes, jamais une phrase', () => {
    const login = loginSchema.safeParse({ email: 'x', password: '' });
    expect(login.success).toBe(false);
    const messages = login.success ? [] : login.error.issues.map((i) => i.message);
    expect(messages).toEqual([ERR.emailInvalid, ERR.passwordRequired]);
    for (const m of messages) expect(isErrorCode(m)).toBe(true);
  });

  it('un schéma plus riche : tous les messages de paroisse sont des codes connus', () => {
    const res = createParishSchema.safeParse({ name: 'a', city: '', country: '', phone: 'abc' });
    expect(res.success).toBe(false);
    const messages = res.success ? [] : res.error.issues.map((i) => i.message);
    expect(messages.length).toBeGreaterThan(2);
    for (const m of messages) expect(isErrorCode(m), m).toBe(true);
  });

  it('les refus de planning sont des codes connus', () => {
    for (const code of Object.values(SCHEDULE_WINDOW_MESSAGES))
      expect(isErrorCode(code)).toBe(true);
  });
});
