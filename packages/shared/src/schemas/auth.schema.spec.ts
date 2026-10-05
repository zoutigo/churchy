import { describe, expect, it } from 'vitest';
import { ERR } from '../constants/error-codes.constants';
import { registerFormSchema } from './auth.schema';

const base = {
  email: 'a@b.fr',
  password: 'password123',
  confirmPassword: 'password123',
  firstName: 'Jean',
  lastName: 'Dupont',
};

describe('registerFormSchema', () => {
  it('accepte deux mots de passe identiques', () => {
    expect(registerFormSchema.safeParse(base).success).toBe(true);
  });

  it('refuse une confirmation différente, sous le champ de confirmation', () => {
    const r = registerFormSchema.safeParse({ ...base, confirmPassword: 'password124' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(['confirmPassword']);
      expect(r.error.issues[0].message).toBe(ERR.passwordsMismatch);
    }
  });

  it('refuse une confirmation vide', () => {
    const r = registerFormSchema.safeParse({ ...base, confirmPassword: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe(ERR.confirmPasswordRequired);
  });

  it('garde les règles du mot de passe (8 caractères minimum)', () => {
    const r = registerFormSchema.safeParse({
      ...base,
      password: 'court',
      confirmPassword: 'court',
    });
    expect(r.success).toBe(false);
  });
});
