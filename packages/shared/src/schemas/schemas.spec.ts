import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateLocaleSchema,
  verifyEmailSchema,
} from './auth.schema';
import { createParishSchema } from './parish.schema';
import {
  addSheetStepSchema,
  cancelOccurrenceSchema,
  changeSheetTemplateSchema,
  createCelebrationSchema,
  createSheetSchema,
  createTemplateStepSchema,
  reorderSheetStepsSchema,
  updateCelebrationSchema,
  updateCelebrationStepSchema,
  updateOccurrenceSchema,
} from './celebration.schema';
import { ContentType } from '../enums/content-type.enum';

// Les ids générés par Prisma (@default(cuid())) ne sont PAS des uuid.
const CUID = 'cmuof7vdf00017mflrizmhgll';

describe('langue', () => {
  it('registerSchema : la langue est facultative, fr ou en seulement', () => {
    const base = {
      email: 'a@b.fr',
      password: 'password123',
      firstName: 'Jean',
      lastName: 'Dupont',
    };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, locale: 'en' }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, locale: 'de' }).success).toBe(false);
  });

  it('updateLocaleSchema : exige fr ou en', () => {
    expect(updateLocaleSchema.safeParse({ locale: 'fr' }).success).toBe(true);
    expect(updateLocaleSchema.safeParse({ locale: 'en' }).success).toBe(true);
    expect(updateLocaleSchema.safeParse({ locale: 'es' }).success).toBe(false);
    expect(updateLocaleSchema.safeParse({}).success).toBe(false);
  });
});

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
  const schedule = { kind: 'dates', dates: [{ date: '2026-10-04', time: '10:00' }] } as const;
  const base = { title: 'Messe', type: 'SUNDAY_MASS', schedule };

  it('accepte un templateId de type cuid (non-régression : ne doit pas exiger un uuid)', () => {
    expect(createCelebrationSchema.safeParse({ ...base, templateId: CUID }).success).toBe(true);
  });

  it('le modèle est facultatif : une série peut être créée sans feuille', () => {
    const res = createCelebrationSchema.parse(base);
    expect(res.templateId).toBeUndefined();
  });

  it('exige un planning et rejette une date qui n’est pas au format AAAA-MM-JJ', () => {
    expect(createCelebrationSchema.safeParse({ title: 'Messe', type: 'OTHER' }).success).toBe(
      false,
    );
    expect(
      createCelebrationSchema.safeParse({
        ...base,
        schedule: { kind: 'dates', dates: [{ date: '04/10/2026', time: '10:00' }] },
      }).success,
    ).toBe(false);
  });

  it('exige un titre et un type connu', () => {
    expect(createCelebrationSchema.safeParse({ ...base, title: '  ' }).success).toBe(false);
    expect(createCelebrationSchema.safeParse({ ...base, type: 'NOPE' }).success).toBe(false);
  });

  it('une description ou une note vide équivaut à « non renseigné »', () => {
    const res = createCelebrationSchema.parse({
      ...base,
      description: '<p></p>',
      internalNote: '   ',
    });
    expect(res.description).toBeUndefined();
    expect(res.internalNote).toBeUndefined();
    const filled = createCelebrationSchema.parse({
      ...base,
      description: '<p>L’évêque sera des nôtres</p>',
      internalNote: 'Micro à vérifier',
    });
    expect(filled.description).toBe('<p>L’évêque sera des nôtres</p>');
    expect(filled.internalNote).toBe('Micro à vérifier');
  });

  it('limite la note interne', () => {
    expect(
      createCelebrationSchema.safeParse({ ...base, internalNote: 'x'.repeat(2001) }).success,
    ).toBe(false);
  });
});

describe('updateCelebrationSchema', () => {
  it('une description ou une note vidée repasse à null', () => {
    const res = updateCelebrationSchema.parse({ description: '<p></p>', internalNote: '' });
    expect(res.description).toBeNull();
    expect(res.internalNote).toBeNull();
  });

  it('permet de retirer le modèle par défaut (null) ou de le laisser inchangé', () => {
    expect(updateCelebrationSchema.parse({ defaultTemplateId: null }).defaultTemplateId).toBeNull();
    expect(updateCelebrationSchema.parse({}).defaultTemplateId).toBeUndefined();
  });
});

describe('feuille de préparation', () => {
  it('createSheetSchema distingue « modèle par défaut » (absent) et « feuille vide » (null)', () => {
    expect(createSheetSchema.parse({}).templateId).toBeUndefined();
    expect(createSheetSchema.parse({ templateId: null }).templateId).toBeNull();
    expect(createSheetSchema.parse({ templateId: CUID }).templateId).toBe(CUID);
  });

  it('changeSheetTemplateSchema exige un choix explicite', () => {
    expect(changeSheetTemplateSchema.safeParse({}).success).toBe(false);
    expect(changeSheetTemplateSchema.safeParse({ templateId: null, dryRun: true }).success).toBe(
      true,
    );
  });

  it('une étape ajoutée à la volée exige un titre', () => {
    expect(addSheetStepSchema.safeParse({ title: ' ' }).success).toBe(false);
    expect(addSheetStepSchema.safeParse({ title: 'Chant à Marie' }).success).toBe(true);
  });

  it('l’ordre des étapes ne peut pas être vide', () => {
    expect(reorderSheetStepsSchema.safeParse({ stepIds: [] }).success).toBe(false);
  });

  it('annuler une date : le motif est facultatif et limité', () => {
    expect(cancelOccurrenceSchema.safeParse({}).success).toBe(true);
    expect(cancelOccurrenceSchema.safeParse({ reason: 'x'.repeat(201) }).success).toBe(false);
  });

  it('modifier une date : l’heure de début est en heure locale', () => {
    expect(
      updateOccurrenceSchema.safeParse({ start: { date: '2026-11-01', time: '09:00' } }).success,
    ).toBe(true);
    expect(
      updateOccurrenceSchema.safeParse({ start: { date: '2026-11-01T09:00:00Z', time: '09:00' } })
        .success,
    ).toBe(false);
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

  it('permet de retirer le contenu lié (null)', () => {
    expect(updateCelebrationStepSchema.parse({ contentId: null }).contentId).toBeNull();
  });
});
