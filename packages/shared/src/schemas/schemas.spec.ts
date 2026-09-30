import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schema';
import { createParishSchema } from './parish.schema';
import {
  createCelebrationSchema,
  createTemplateStepSchema,
  updateCelebrationStepSchema,
} from './celebration.schema';
import { ContentType } from '../enums/content-type.enum';

// Les ids générés par Prisma (@default(cuid())) ne sont PAS des uuid.
const CUID = 'cmuof7vdf00017mflrizmhgll';

describe('registerSchema', () => {
  const valid = { email: 'a@b.fr', password: 'password123', firstName: 'Jean', lastName: 'Dupont' };

  it('accepte des données valides', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejette un email invalide', () => {
    const res = registerSchema.safeParse({ ...valid, email: 'pas-un-email' });
    expect(res.success).toBe(false);
  });

  it('rejette un mot de passe de moins de 8 caractères', () => {
    const res = registerSchema.safeParse({ ...valid, password: '1234567' });
    expect(res.success).toBe(false);
  });
});

describe('normalisation des emails', () => {
  it('passe l’email en minuscules et retire les espaces (register, login, forgot)', () => {
    const email = '  Jean.Dupont@Paroisse.FR ';
    expect(
      registerSchema.parse({ email, password: 'password123', firstName: 'J', lastName: 'D' }).email,
    ).toBe('jean.dupont@paroisse.fr');
    expect(loginSchema.parse({ email, password: 'x' }).email).toBe('jean.dupont@paroisse.fr');
    expect(forgotPasswordSchema.parse({ email }).email).toBe('jean.dupont@paroisse.fr');
  });
});

describe('loginSchema', () => {
  it('exige un mot de passe non vide', () => {
    expect(loginSchema.safeParse({ email: 'a@b.fr', password: '' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('exige un email valide', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.fr' }).success).toBe(true);
  });
});

describe('resetPasswordSchema', () => {
  it('exige un jeton et un mot de passe de 8 caractères minimum', () => {
    expect(resetPasswordSchema.safeParse({ token: '', password: 'password123' }).success).toBe(
      false,
    );
    expect(resetPasswordSchema.safeParse({ token: 't', password: 'court' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: 't', password: 'password123' }).success).toBe(
      true,
    );
  });
});

describe('verifyEmailSchema', () => {
  it('exige un jeton non vide', () => {
    expect(verifyEmailSchema.safeParse({ token: '' }).success).toBe(false);
    expect(verifyEmailSchema.safeParse({ token: 'abc' }).success).toBe(true);
  });
});

describe('createParishSchema', () => {
  it('exige nom (2+), ville et pays', () => {
    expect(createParishSchema.safeParse({ name: 'x', city: '', country: '' }).success).toBe(false);
    expect(
      createParishSchema.safeParse({ name: 'Saint Pierre', city: 'Douala', country: 'Cameroun' })
        .success,
    ).toBe(true);
  });
});

describe('createCelebrationSchema', () => {
  it('accepte un templateId de type cuid (non-régression : ne doit pas exiger un uuid)', () => {
    const res = createCelebrationSchema.safeParse({
      templateId: CUID,
      title: 'Messe',
      date: '2026-10-04T09:00:00.000Z',
    });
    expect(res.success).toBe(true);
  });

  it('rejette une date qui n’est pas au format ISO', () => {
    const res = createCelebrationSchema.safeParse({
      templateId: CUID,
      title: 'Messe',
      date: '04/10/2026',
    });
    expect(res.success).toBe(false);
  });
});

describe('createTemplateStepSchema', () => {
  const base = { title: 'Première lecture', key: 'reading-1', order: 1 };

  it('accepte un ContentType connu', () => {
    const res = createTemplateStepSchema.safeParse({
      ...base,
      expectedContentType: ContentType.READING,
    });
    expect(res.success).toBe(true);
  });

  it('rejette un ContentType inconnu', () => {
    expect(
      createTemplateStepSchema.safeParse({ ...base, expectedContentType: 'NOPE' }).success,
    ).toBe(false);
  });

  it('isRequired vaut true par défaut', () => {
    const res = createTemplateStepSchema.parse(base);
    expect(res.isRequired).toBe(true);
  });
});

describe('updateCelebrationStepSchema', () => {
  it('accepte un contentId cuid', () => {
    expect(updateCelebrationStepSchema.safeParse({ contentId: CUID }).success).toBe(true);
  });
});
