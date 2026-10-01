import { describe, expect, it } from 'vitest';
import { createParishSchema, searchParishesSchema, updateParishSchema } from './parish.schema';
import { createActivitySchema, createAnnouncementSchema } from './announcement.schema';
import { contactMessageSchema } from './contact.schema';
import { createCelebrationSchema, setCelebrationAnnouncedSchema } from './celebration.schema';

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
    const base = { templateId: 't1', title: 'Messe', date: '2026-10-04T09:00:00.000Z' };
    expect(createCelebrationSchema.parse({ ...base, announced: true }).announced).toBe(true);
    expect(createCelebrationSchema.parse(base).announced).toBeUndefined();
    expect(setCelebrationAnnouncedSchema.safeParse({ announced: 'oui' }).success).toBe(false);
    expect(setCelebrationAnnouncedSchema.safeParse({ announced: false }).success).toBe(true);
  });
});
