import { describe, expect, it } from 'vitest';
import { ERR } from '../constants/error-codes.constants';
import {
  addEmailSchema,
  adminPinResetSchema,
  changePinFormSchema,
  changePinSchema,
  forgotPinSchema,
  googleAuthSchema,
  googleLinkSchema,
  linkGoogleSchema,
  loginPhoneSchema,
  registerPhoneFormSchema,
  registerPhoneSchema,
  resetPinFormSchema,
  resetPinSchema,
  setPasswordSchema,
  setPhonePinSchema,
  registerFormSchema,
} from './auth.schema';

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

const issueMessages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues.map((i) => i.message) ?? [];

describe('registerPhoneSchema', () => {
  const base = {
    phone: '+237 6 77 12 34 56',
    pin: '482915',
    firstName: 'Jean',
    lastName: 'Dupont',
  };

  it('normalise le numéro en E.164', () => {
    const r = registerPhoneSchema.parse(base);
    expect(r.phone).toBe('+237677123456');
  });

  it('accepte « 00 » à la place de « + »', () => {
    expect(registerPhoneSchema.parse({ ...base, phone: '00237677123456' }).phone).toBe(
      '+237677123456',
    );
  });

  it.each([
    ['sans indicatif', '677123456'],
    ['incomplet', '+23767712'],
    ['vide', ''],
  ])('refuse un numéro %s', (_label, phone) => {
    expect(registerPhoneSchema.safeParse({ ...base, phone }).success).toBe(false);
  });

  it.each([
    ['5 chiffres', '48291', ERR.pinInvalid],
    ['7 chiffres', '4829156', ERR.pinInvalid],
    ['lettres', '48a915', ERR.pinInvalid],
    ['suite', '123456', ERR.pinTooWeak],
    ['répété', '000000', ERR.pinTooWeak],
  ])('refuse un PIN %s', (_label, pin, code) => {
    const r = registerPhoneSchema.safeParse({ ...base, pin });
    expect(r.success).toBe(false);
    expect(issueMessages(r)).toContain(code);
  });

  it('exige prénom et nom', () => {
    expect(registerPhoneSchema.safeParse({ ...base, firstName: '' }).success).toBe(false);
    expect(registerPhoneSchema.safeParse({ ...base, lastName: '' }).success).toBe(false);
  });

  it('langue facultative, fr ou en', () => {
    expect(registerPhoneSchema.safeParse({ ...base, locale: 'en' }).success).toBe(true);
    expect(registerPhoneSchema.safeParse({ ...base, locale: 'de' }).success).toBe(false);
  });
});

describe('registerPhoneFormSchema', () => {
  const base = {
    phone: '+237677123456',
    pin: '482915',
    confirmPin: '482915',
    firstName: 'Jean',
    lastName: 'Dupont',
  };

  it('accepte deux PIN identiques', () => {
    expect(registerPhoneFormSchema.safeParse(base).success).toBe(true);
  });

  it('refuse une confirmation différente, sous le champ de confirmation', () => {
    const r = registerPhoneFormSchema.safeParse({ ...base, confirmPin: '482916' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(['confirmPin']);
    expect(r.error?.issues[0].message).toBe(ERR.pinsMismatch);
  });

  it('refuse une confirmation vide', () => {
    expect(issueMessages(registerPhoneFormSchema.safeParse({ ...base, confirmPin: '' }))).toContain(
      ERR.confirmPinRequired,
    );
  });
});

describe('loginPhoneSchema', () => {
  it('ne rappelle pas les règles de création : un PIN faux est juste faux', () => {
    expect(loginPhoneSchema.safeParse({ phone: '+237677123456', pin: '12' }).success).toBe(true);
  });

  it('exige un PIN et un numéro valide', () => {
    expect(loginPhoneSchema.safeParse({ phone: '+237677123456', pin: '' }).success).toBe(false);
    expect(loginPhoneSchema.safeParse({ phone: 'abc', pin: '482915' }).success).toBe(false);
  });
});

describe('récupération du PIN', () => {
  it('forgotPinSchema normalise le numéro', () => {
    expect(forgotPinSchema.parse({ phone: '+237 677 12 34 56' }).phone).toBe('+237677123456');
  });

  it('resetPinSchema exige un jeton et un PIN acceptable', () => {
    expect(resetPinSchema.safeParse({ token: 'abc', pin: '482915' }).success).toBe(true);
    expect(resetPinSchema.safeParse({ token: '', pin: '482915' }).success).toBe(false);
    expect(resetPinSchema.safeParse({ token: 'abc', pin: '111111' }).success).toBe(false);
  });

  it('resetPinFormSchema vérifie la confirmation', () => {
    expect(resetPinFormSchema.safeParse({ pin: '482915', confirmPin: '482915' }).success).toBe(
      true,
    );
    expect(resetPinFormSchema.safeParse({ pin: '482915', confirmPin: '000000' }).success).toBe(
      false,
    );
  });
});

describe('Google', () => {
  it('googleAuthSchema exige le jeton d’identité', () => {
    expect(googleAuthSchema.safeParse({ idToken: 'x.y.z' }).success).toBe(true);
    expect(googleAuthSchema.safeParse({ idToken: '' }).success).toBe(false);
    expect(googleAuthSchema.safeParse({}).success).toBe(false);
  });

  it('googleLinkSchema exige aussi le mot de passe du compte existant', () => {
    expect(googleLinkSchema.safeParse({ idToken: 'x', password: 'secret123' }).success).toBe(true);
    expect(googleLinkSchema.safeParse({ idToken: 'x', password: '' }).success).toBe(false);
  });

  it('linkGoogleSchema accepte une preuve facultative (mot de passe ou PIN)', () => {
    expect(linkGoogleSchema.safeParse({ idToken: 'x' }).success).toBe(true);
    expect(linkGoogleSchema.safeParse({ idToken: 'x', currentPin: '482915' }).success).toBe(true);
  });
});

describe('sécurité du compte', () => {
  it('addEmailSchema normalise l’email', () => {
    expect(addEmailSchema.parse({ email: ' Jean@Paroisse.FR ' }).email).toBe('jean@paroisse.fr');
    expect(addEmailSchema.safeParse({ email: 'pas-un-email' }).success).toBe(false);
  });

  it('setPasswordSchema impose 8 caractères', () => {
    expect(setPasswordSchema.safeParse({ password: 'court' }).success).toBe(false);
    expect(setPasswordSchema.safeParse({ password: 'longenough1' }).success).toBe(true);
  });

  it('setPhonePinSchema valide numéro et PIN', () => {
    expect(setPhonePinSchema.safeParse({ phone: '+237677123456', pin: '482915' }).success).toBe(
      true,
    );
    expect(setPhonePinSchema.safeParse({ phone: '+237677123456', pin: '123456' }).success).toBe(
      false,
    );
  });

  it('changePinSchema exige le PIN actuel et un nouveau PIN acceptable', () => {
    expect(changePinSchema.safeParse({ currentPin: '482915', pin: '739104' }).success).toBe(true);
    expect(changePinSchema.safeParse({ currentPin: '', pin: '739104' }).success).toBe(false);
    expect(changePinSchema.safeParse({ currentPin: '482915', pin: '654321' }).success).toBe(false);
    expect(
      changePinFormSchema.safeParse({ currentPin: '482915', pin: '739104', confirmPin: '739105' })
        .success,
    ).toBe(false);
  });

  it('adminPinResetSchema attend un numéro valide', () => {
    expect(adminPinResetSchema.safeParse({ phone: '+237 677 12 34 56' }).success).toBe(true);
    expect(adminPinResetSchema.safeParse({ phone: '12' }).success).toBe(false);
  });
});
