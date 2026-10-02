import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Agent, createTestApp, registerAgent } from './helpers';

const inDays = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

/**
 * Lecture publique (sans cookie) : recherche de paroisses, page d'une paroisse, messes, annonces,
 * activités. Vérifie surtout ce qui ne doit PAS être visible.
 */
describe('API publique', () => {
  let app: INestApplication;
  let admin: Agent;
  let parishId: string;
  let templateId: string;
  let draftId: string;
  let announcedId: string;
  let publishedId: string;
  const http = () => request(app.getHttpServer());

  const celebrate = async (title: string, date: string, extra: object = {}) =>
    (
      await admin
        .post(`/api/parishes/${parishId}/celebrations`)
        .send({ templateId, title, date, ...extra })
        .expect(201)
    ).body.id as string;

  beforeAll(async () => {
    app = await createTestApp();
    admin = await registerAgent(app, 'public-admin@test.fr');

    parishId = (
      await admin
        .post('/api/parishes')
        .send({
          name: 'Notre-Dame des Pubs',
          city: 'Bordeaux',
          country: 'France',
          region: 'Nouvelle-Aquitaine',
          district: 'Chartrons',
          addressComplement: 'En face de la poste centrale',
          mainChurch: 'Église Saint-Louis',
          address: '5 place Publique',
          phone: '05 00 00 00 00',
          email: 'contact@paroisse-pub.fr',
          website: 'https://paroisse-pub.fr',
          description: 'Une paroisse vivante.',
        })
        .expect(201)
    ).body.id;
    templateId = (
      await admin
        .post(`/api/parishes/${parishId}/templates`)
        .send({ name: 'Messe dominicale', type: 'SUNDAY_MASS' })
        .expect(201)
    ).body.id;

    draftId = await celebrate('Messe brouillon secrète', inDays(2));
    announcedId = await celebrate('Messe annoncée', inDays(3), { announced: true });
    publishedId = await celebrate('Messe publiée', inDays(4));
    await admin.post(`/api/celebrations/${publishedId}/publish`).expect(201);
    // Passée : ne doit pas apparaître dans les « à venir ».
    const pastId = await celebrate('Messe passée', inDays(-5));
    await admin.post(`/api/celebrations/${pastId}/publish`).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('recherche de paroisses', () => {
    it('trouve par nom, ville, quartier ou église, sans tenir compte de la casse', async () => {
      for (const q of ['notre-dame', 'BORDEAUX', 'chartrons', 'saint-louis', 'place publique']) {
        const res = await http().get('/api/public/parishes').query({ q }).expect(200);
        expect(res.body.items.map((p: { id: string }) => p.id)).toContain(parishId);
      }
    });

    it('exige tous les mots, chacun dans l’un des champs', async () => {
      const ok = await http().get('/api/public/parishes').query({ q: 'notre bordeaux' });
      expect(ok.body.items.map((p: { id: string }) => p.id)).toContain(parishId);
      const ko = await http().get('/api/public/parishes').query({ q: 'notre marseille' });
      expect(ko.body.items.map((p: { id: string }) => p.id)).not.toContain(parishId);
    });

    it('renvoie une liste vide (et non une erreur) sans résultat', async () => {
      const res = await http()
        .get('/api/public/parishes')
        .query({ q: 'introuvable-xyz' })
        .expect(200);
      expect(res.body).toEqual({ items: [], total: 0, page: 1, limit: 12 });
    });

    it('joint la prochaine messe VISIBLE (annoncée), jamais le brouillon ni le passé', async () => {
      const res = await http().get('/api/public/parishes').query({ q: 'Notre-Dame des Pubs' });
      const item = res.body.items.find((p: { id: string }) => p.id === parishId);
      expect(item.nextCelebration).toMatchObject({
        id: announcedId,
        title: 'Messe annoncée',
        type: 'SUNDAY_MASS',
        sheetStatus: 'IN_PREPARATION',
      });
    });

    it('pagine', async () => {
      const res = await http().get('/api/public/parishes').query({ limit: 1, page: 1 }).expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.limit).toBe(1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('valide les paramètres (400)', async () => {
      await http().get('/api/public/parishes').query({ limit: 500 }).expect(400);
      await http().get('/api/public/parishes').query({ page: 0 }).expect(400);
    });

    it('ne renvoie aucune donnée interne dans les résultats', async () => {
      const res = await http().get('/api/public/parishes').query({ q: 'Notre-Dame des Pubs' });
      const item = res.body.items[0];
      expect(Object.keys(item).sort()).toEqual(
        ['city', 'country', 'district', 'id', 'mainChurch', 'name', 'nextCelebration'].sort(),
      );
    });
  });

  describe('page d’une paroisse', () => {
    it('expose les informations publiques, par id, sans cookie', async () => {
      const res = await http().get(`/api/public/parishes/${parishId}`).expect(200);
      expect(res.body).toMatchObject({
        id: parishId,
        name: 'Notre-Dame des Pubs',
        city: 'Bordeaux',
        region: 'Nouvelle-Aquitaine',
        district: 'Chartrons',
        address: '5 place Publique',
        addressComplement: 'En face de la poste centrale',
        phone: '05 00 00 00 00',
        email: 'contact@paroisse-pub.fr',
        website: 'https://paroisse-pub.fr',
      });
    });

    it('n’expose ni membres ni champs internes (slug, dates de gestion)', async () => {
      const res = await http().get(`/api/public/parishes/${parishId}`).expect(200);
      expect(res.body).not.toHaveProperty('members');
      expect(res.body).not.toHaveProperty('slug');
      expect(res.body).not.toHaveProperty('createdAt');
    });

    it('404 pour une paroisse inconnue, sur toutes les routes', async () => {
      for (const path of ['', '/celebrations', '/announcements', '/activities']) {
        await http().get(`/api/public/parishes/inconnue${path}`).expect(404);
      }
    });

    it('l’ancienne route par slug n’existe plus', async () => {
      await http().get('/api/parishes/slug/notre-dame-des-pubs').expect(404);
    });
  });

  describe('messes', () => {
    it('liste les messes à venir visibles, par date croissante', async () => {
      const res = await http().get(`/api/public/parishes/${parishId}/celebrations`).expect(200);
      expect(res.body.map((c: { id: string }) => c.id)).toEqual([announcedId, publishedId]);
      expect(res.body.map((c: { sheetStatus: string }) => c.sheetStatus)).toEqual([
        'IN_PREPARATION',
        'AVAILABLE',
      ]);
    });

    it('un brouillon non annoncé est introuvable', async () => {
      await http().get(`/api/public/celebrations/${draftId}`).expect(404);
    });

    it('une messe annoncée est visible mais sans déroulement', async () => {
      const res = await http().get(`/api/public/celebrations/${announcedId}`).expect(200);
      expect(res.body).toMatchObject({
        title: 'Messe annoncée',
        sheetStatus: 'IN_PREPARATION',
        steps: [],
        parish: { id: parishId, name: 'Notre-Dame des Pubs', city: 'Bordeaux' },
      });
    });

    it('une messe publiée expose sa feuille', async () => {
      const res = await http().get(`/api/public/celebrations/${publishedId}`).expect(200);
      expect(res.body.sheetStatus).toBe('AVAILABLE');
      expect(Array.isArray(res.body.steps)).toBe(true);
    });

    it('annoncer / retirer l’annonce change la visibilité, l’archivage la supprime', async () => {
      await admin
        .patch(`/api/celebrations/${draftId}/announced`)
        .send({ announced: true })
        .expect(200);
      await http().get(`/api/public/celebrations/${draftId}`).expect(200);
      await admin
        .patch(`/api/celebrations/${draftId}/announced`)
        .send({ announced: false })
        .expect(200);
      await http().get(`/api/public/celebrations/${draftId}`).expect(404);

      await admin.post(`/api/celebrations/${announcedId}/archive`).expect(201);
      await http().get(`/api/public/celebrations/${announcedId}`).expect(404);
      const list = await http().get(`/api/public/parishes/${parishId}/celebrations`).expect(200);
      expect(list.body.map((c: { id: string }) => c.id)).toEqual([publishedId]);
    });
  });

  describe('annonces et activités', () => {
    it('publie une annonce visible immédiatement (plus récente d’abord)', async () => {
      await admin
        .post(`/api/parishes/${parishId}/announcements`)
        .send({ title: 'Première', body: 'Corps 1' })
        .expect(201);
      await admin
        .post(`/api/parishes/${parishId}/announcements`)
        .send({
          title: 'Seconde',
          summary: 'Résumé',
          body: 'Corps 2',
          imageUrl: 'https://exemple.fr/a.jpg',
        })
        .expect(201);

      const res = await http().get(`/api/public/parishes/${parishId}/announcements`).expect(200);
      expect(res.body.map((a: { title: string }) => a.title)).toEqual(['Seconde', 'Première']);
      expect(res.body[0]).toMatchObject({
        summary: 'Résumé',
        imageUrl: 'https://exemple.fr/a.jpg',
      });
      expect(res.body[0]).not.toHaveProperty('createdById');
    });

    it('valide les annonces (400) : titre, contenu, image non http(s)', async () => {
      const post = (body: object) =>
        admin.post(`/api/parishes/${parishId}/announcements`).send(body);
      await post({ title: '', body: 'x' }).expect(400);
      await post({ title: 'x', body: '' }).expect(400);
      await post({ title: 'x', body: 'y', imageUrl: 'javascript:alert(1)' }).expect(400);
    });

    it('liste les activités à venir par date croissante, sans les passées', async () => {
      const create = (title: string, startsAt: string) =>
        admin
          .post(`/api/parishes/${parishId}/activities`)
          .send({ title, description: 'Description', startsAt, location: 'Salle paroissiale' })
          .expect(201);
      await create('Retraite', inDays(20));
      await create('Rencontre', inDays(5));
      await create('Passée', inDays(-3));

      const res = await http().get(`/api/public/parishes/${parishId}/activities`).expect(200);
      expect(res.body.map((a: { title: string }) => a.title)).toEqual(['Rencontre', 'Retraite']);
      expect(res.body[0].location).toBe('Salle paroissiale');
    });

    it('valide les activités (400) : date non ISO, description manquante', async () => {
      const post = (body: object) => admin.post(`/api/parishes/${parishId}/activities`).send(body);
      await post({ title: 'x', description: 'y', startsAt: 'demain' }).expect(400);
      await post({ title: 'x', startsAt: inDays(1) }).expect(400);
    });
  });
});
