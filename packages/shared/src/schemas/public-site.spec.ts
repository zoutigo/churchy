import { describe, expect, it } from 'vitest';
import {
  createParishSchema,
  calendarQuerySchema,
  searchParishesSchema,
  parishIdsQuerySchema,
  mergeFavoritesSchema,
  updateParishSchema,
  withCompletePhone,
} from './parish.schema';
import { MAX_FAVORITE_PARISHES } from '../constants/business.constants';
import { createActivitySchema, createAnnouncementSchema } from './announcement.schema';
import { clientErrorSchema } from './client-error.schema';
import { contactMessageSchema } from './contact.schema';
import { createCelebrationSchema, updateCelebrationSchema } from './celebration.schema';

describe('createParishSchema — informations publiques', () => {
  const base = { name: 'Saint Pierre', city: 'Lyon', country: 'France' };

  it('traite les champs facultatifs vides d’un formulaire comme non renseignés', () => {
    const res = createParishSchema.parse({
      ...base,
      district: '',
      address: '',
      email: '',
      website: '',
      imageUrl: '',
    });
    expect(res.district).toBeUndefined();
    expect(res.email).toBeUndefined();
    expect(res.website).toBeUndefined();
    expect(res.imageUrl).toBeUndefined();
  });

  it('accepte des coordonnées complètes', () => {
    const res = createParishSchema.safeParse({
      ...base,
      district: 'Croix-Rousse',
      address: '1 place de l’Église',
      mainChurch: 'Église Saint-Pierre',
      phone: '04 00 00 00 00',
      email: 'contact@paroisse.fr',
      website: 'https://paroisse.fr',
      imageUrl: 'https://paroisse.fr/photo.jpg',
    });
    expect(res.success).toBe(true);
  });

  it('rejette un email ou une adresse web invalides', () => {
    expect(createParishSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
    expect(createParishSchema.safeParse({ ...base, website: 'pas une url' }).success).toBe(false);
  });

  it('refuse les URL non http(s) (javascript:, data:…) pour le site et l’image', () => {
    expect(createParishSchema.safeParse({ ...base, website: 'javascript:alert(1)' }).success).toBe(
      false,
    );
    expect(createParishSchema.safeParse({ ...base, imageUrl: 'data:text/html,x' }).success).toBe(
      false,
    );
    expect(createParishSchema.safeParse({ ...base, imageUrl: 'ftp://x.fr/a.png' }).success).toBe(
      false,
    );
  });
});

describe('updateParishSchema', () => {
  it('accepte une mise à jour partielle', () => {
    expect(updateParishSchema.parse({ address: '2 rue Neuve' })).toEqual({
      address: '2 rue Neuve',
    });
  });

  it('une chaîne vide efface le champ (null), l’absence le laisse intact (undefined)', () => {
    const res = updateParishSchema.parse({ phone: '' });
    expect(res.phone).toBeNull();
    expect(res.address).toBeUndefined();
  });

  it('rejette un nom trop court', () => {
    expect(updateParishSchema.safeParse({ name: 'x' }).success).toBe(false);
  });
});

describe('searchParishesSchema', () => {
  it('applique les valeurs par défaut', () => {
    expect(searchParishesSchema.parse({})).toEqual({ page: 1, limit: 12 });
  });

  it('convertit page/limit (chaînes d’URL) et borne la taille de page', () => {
    expect(searchParishesSchema.parse({ q: ' lyon ', page: '2', limit: '5' })).toEqual({
      q: 'lyon',
      page: 2,
      limit: 5,
    });
    expect(searchParishesSchema.safeParse({ limit: '500' }).success).toBe(false);
    expect(searchParishesSchema.safeParse({ page: '0' }).success).toBe(false);
  });
});

describe('createAnnouncementSchema', () => {
  it('exige un titre et un contenu', () => {
    expect(createAnnouncementSchema.safeParse({ title: '', body: 'x' }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ title: 'x', body: '' }).success).toBe(false);
  });

  it('ignore un résumé ou une image vides et refuse une image non http(s)', () => {
    const res = createAnnouncementSchema.parse({
      title: 'Horaires',
      body: 'Nouveaux horaires',
      summary: '',
      imageUrl: '',
    });
    expect(res.summary).toBeUndefined();
    expect(res.imageUrl).toBeUndefined();
    expect(
      createAnnouncementSchema.safeParse({ title: 'a', body: 'b', imageUrl: 'javascript:alert(1)' })
        .success,
    ).toBe(false);
  });
});

describe('createActivitySchema', () => {
  const valid = {
    title: 'Groupe de jeunes',
    description: 'Rencontre mensuelle',
    startsAt: '2026-11-01T18:00:00.000Z',
  };

  it('accepte une activité valide', () => {
    expect(createActivitySchema.safeParse(valid).success).toBe(true);
  });

  it('rejette une date non ISO', () => {
    expect(createActivitySchema.safeParse({ ...valid, startsAt: 'demain' }).success).toBe(false);
  });
});

describe('contactMessageSchema', () => {
  const valid = {
    name: 'Marie',
    email: ' Marie@Exemple.FR ',
    topic: 'QUESTION',
    message: 'Bonjour, comment ça marche ?',
  };

  it('normalise l’email', () => {
    expect(contactMessageSchema.parse(valid).email).toBe('marie@exemple.fr');
  });

  it('rejette un message trop court, un sujet inconnu ou un email invalide', () => {
    expect(contactMessageSchema.safeParse({ ...valid, message: 'court' }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...valid, topic: 'SPAM' }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
  });
});

describe('célébrations — annonce publique', () => {
  it('accepte `announced` à la création et exige un booléen pour le modifier', () => {
    const base = {
      title: 'Messe',
      type: 'SUNDAY_MASS',
      schedule: { kind: 'dates', dates: [{ date: '2026-10-04', time: '10:00' }] },
    } as const;
    expect(createCelebrationSchema.parse({ ...base, announced: true }).announced).toBe(true);
    expect(createCelebrationSchema.parse(base).announced).toBeUndefined();
    expect(updateCelebrationSchema.safeParse({ announced: 'oui' }).success).toBe(false);
    expect(updateCelebrationSchema.safeParse({ announced: false }).success).toBe(true);
  });
});

describe('région et complément d’adresse', () => {
  it('sont facultatifs à la création ; une chaîne vide équivaut à non renseigné', () => {
    const res = createParishSchema.parse({
      name: 'Saint Joseph',
      city: 'Yaoundé',
      country: 'Cameroun',
      region: '',
      addressComplement: '',
    });
    expect(res.region).toBeUndefined();
    expect(res.addressComplement).toBeUndefined();
  });

  it('sont conservés, et le complément est limité à 200 caractères', () => {
    const base = { name: 'Saint Joseph', city: 'Yaoundé', country: 'Cameroun' };
    expect(
      createParishSchema.parse({
        ...base,
        region: 'Centre',
        addressComplement: 'En face de la poste',
      }),
    ).toMatchObject({ region: 'Centre', addressComplement: 'En face de la poste' });
    expect(
      createParishSchema.safeParse({ ...base, addressComplement: 'x'.repeat(201) }).success,
    ).toBe(false);
  });

  it('à la modification, une chaîne vide efface la valeur (null)', () => {
    expect(updateParishSchema.parse({ region: '', addressComplement: '' })).toEqual({
      region: null,
      addressComplement: null,
    });
  });
});

describe('téléphone d’une paroisse', () => {
  const base = { name: 'Saint Pierre', city: 'Yaoundé', country: 'Cameroun' };

  it('refuse des caractères qui ne sont pas ceux d’un numéro', () => {
    expect(createParishSchema.safeParse({ ...base, phone: 'appelez-moi' }).success).toBe(false);
    expect(createParishSchema.safeParse({ ...base, phone: '+237 6 77 12 34 56' }).success).toBe(
      true,
    );
  });

  it('withCompletePhone exige un numéro complet pour le pays, mais pas de numéro du tout', () => {
    const schema = withCompletePhone(createParishSchema);
    expect(schema.safeParse({ ...base, phone: '+237 6 77' }).success).toBe(false);
    expect(schema.safeParse({ ...base, phone: '+237 6 77 12 34 56' }).success).toBe(true);
    expect(schema.safeParse(base).success).toBe(true);
  });
});

describe('calendarQuerySchema', () => {
  it('le mois est facultatif', () => {
    expect(calendarQuerySchema.parse({})).toEqual({});
    expect(calendarQuerySchema.parse({ month: '2026-10' })).toEqual({ month: '2026-10' });
  });

  it('refuse un mois mal formé ou hors limites', () => {
    for (const month of ['2026-13', '2026-1', 'octobre', '1999-12', '2101-01']) {
      expect(calendarQuerySchema.safeParse({ month }).success).toBe(false);
    }
  });
});

describe('favoris de paroisses', () => {
  it('découpe, nettoie et dédoublonne la liste d’ids de la requête', () => {
    expect(parishIdsQuerySchema.parse({ ids: ' a, b ,,a,c ' }).ids).toEqual(['a', 'b', 'c']);
    expect(parishIdsQuerySchema.parse({ ids: '' }).ids).toEqual([]);
  });

  it(`refuse plus de ${MAX_FAVORITE_PARISHES} paroisses`, () => {
    const ids = Array.from({ length: MAX_FAVORITE_PARISHES + 1 }, (_, i) => `p${i}`);
    expect(parishIdsQuerySchema.safeParse({ ids: ids.join(',') }).success).toBe(false);
    expect(mergeFavoritesSchema.safeParse({ parishIds: ids }).success).toBe(false);
    expect(mergeFavoritesSchema.safeParse({ parishIds: ids.slice(0, 10) }).success).toBe(true);
  });

  it('dédoublonne avant de compter la limite', () => {
    const ids = Array.from({ length: 15 }, () => 'same');
    expect(mergeFavoritesSchema.parse({ parishIds: ids }).parishIds).toEqual(['same']);
  });
});

describe('clientErrorSchema', () => {
  it('accepte un rapport minimal et refuse une source inconnue ou un message trop long', () => {
    expect(clientErrorSchema.safeParse({ message: 'boom', source: 'global' }).success).toBe(true);
    expect(clientErrorSchema.safeParse({ message: 'boom', source: 'x' }).success).toBe(false);
    expect(
      clientErrorSchema.safeParse({ message: 'x'.repeat(501), source: 'segment' }).success,
    ).toBe(false);
  });
});
