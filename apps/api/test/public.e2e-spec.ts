import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { Agent, createTestApp, onDays, registerAgent } from './helpers';

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
  /** Une série non annoncée (brouillon), une annoncée à deux dates, une dont la feuille est publiée. */
  let draft: { id: string; occurrenceId: string };
  let announced: { id: string; occurrenceId: string; secondOccurrenceId: string };
  let published: { id: string; occurrenceId: string; sheetId: string };
  const http = () => request(app.getHttpServer());

  const createSeries = async (
    title: string,
    days: number[],
    extra: Record<string, unknown> = {},
  ) => {
    const res = await admin
      .post(`/api/parishes/${parishId}/celebrations`)
      .send({ title, type: 'SUNDAY_MASS', templateId, schedule: onDays(...days), ...extra })
      .expect(201);
    return {
      id: res.body.id as string,
      occurrences: res.body.occurrences.map((o: { id: string }) => o.id) as string[],
    };
  };

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

    await admin
      .post(`/api/templates/${templateId}/steps`)
      .send({ title: 'Première lecture', key: 'reading-1', order: 1 })
      .expect(201);

    const d = await createSeries('Messe brouillon secrète', [2]);
    draft = { id: d.id, occurrenceId: d.occurrences[0] };

    const n = await createSeries('Messe annoncée', [3, 17], {
      announced: true,
      description: '<p>Messe de rentrée <strong>pour tous</strong></p>',
      internalNote: 'SECRET-NOTE : peintre en retard',
    });
    await admin
      .patch(`/api/occurrences/${n.occurrences[0]}`)
      .send({
        description: '<p>L’évêque sera des nôtres</p>',
        internalNote: 'SECRET-NOTE-DATE : prévoir la mitre',
      })
      .expect(200);
    announced = { id: n.id, occurrenceId: n.occurrences[0], secondOccurrenceId: n.occurrences[1] };

    const p = await createSeries('Messe publiée', [4], { announced: true });
    const sheet = await admin
      .post(`/api/occurrences/${p.occurrences[0]}/sheet`)
      .send({})
      .expect(201);
    await admin
      .patch(`/api/sheets/${sheet.body.id}/steps/${sheet.body.steps[0].id}`)
      .send({ customText: 'Isaïe 55' })
      .expect(200);
    await admin.post(`/api/sheets/${sheet.body.id}/publish`).expect(201);
    published = { id: p.id, occurrenceId: p.occurrences[0], sheetId: sheet.body.id };

    // Une date passée (impossible à créer par l'API : le passé est immuable) : ne doit jamais
    // apparaître dans les « à venir ».
    const prisma = app.get(PrismaService);
    const past = await createSeries('Messe passée', [1], { announced: true });
    await prisma.celebrationOccurrence.update({
      where: { id: past.occurrences[0] },
      data: { startsAt: new Date(Date.now() - 5 * 86_400_000) },
    });
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
        id: announced.occurrenceId,
        celebrationId: announced.id,
        title: 'Messe annoncée',
        type: 'SUNDAY_MASS',
        sheetStatus: 'IN_PREPARATION',
        cancelled: false,
        timezone: 'Europe/Paris',
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
    const ids = (body: { id: string }[]) => body.map((c) => c.id);

    it('liste les dates à venir visibles, par ordre croissant, passé et brouillon exclus', async () => {
      const res = await http().get(`/api/public/parishes/${parishId}/celebrations`).expect(200);
      expect(ids(res.body)).toEqual([
        announced.occurrenceId,
        published.occurrenceId,
        announced.secondOccurrenceId,
      ]);
      expect(res.body.map((c: { sheetStatus: string }) => c.sheetStatus)).toEqual([
        'IN_PREPARATION',
        'AVAILABLE',
        'IN_PREPARATION',
      ]);
      // Une série annoncée montre TOUTES ses dates, même sans feuille : un fidèle voit qu'il y aura une messe.
      expect(res.body[0].celebrationId).toBe(res.body[2].celebrationId);
    });

    it('les dates d’une série non annoncée sont introuvables', async () => {
      await http().get(`/api/public/celebrations/${draft.occurrenceId}`).expect(404);
    });

    it('une date annoncée est visible avec ses descriptions, sans déroulement', async () => {
      const res = await http()
        .get(`/api/public/celebrations/${announced.occurrenceId}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: announced.occurrenceId,
        title: 'Messe annoncée',
        sheetStatus: 'IN_PREPARATION',
        steps: [],
        description: '<p>Messe de rentrée <strong>pour tous</strong></p>',
        occurrenceDescription: '<p>L’évêque sera des nôtres</p>',
        parish: { id: parishId, name: 'Notre-Dame des Pubs', city: 'Bordeaux' },
      });
    });

    it('la deuxième date de la série n’a pas la précision de la première', async () => {
      const res = await http()
        .get(`/api/public/celebrations/${announced.secondOccurrenceId}`)
        .expect(200);
      expect(res.body.occurrenceDescription).toBeNull();
      expect(res.body.description).toContain('Messe de rentrée');
    });

    it('une date dont la feuille est publiée expose son déroulement', async () => {
      const res = await http()
        .get(`/api/public/celebrations/${published.occurrenceId}`)
        .expect(200);
      expect(res.body.sheetStatus).toBe('AVAILABLE');
      expect(res.body.steps).toEqual([
        expect.objectContaining({ title: 'Première lecture', customText: 'Isaïe 55' }),
      ]);
    });

    it('ne divulgue JAMAIS une note interne, sur aucune route publique', async () => {
      const bodies = [
        (await http().get(`/api/public/parishes/${parishId}/celebrations`)).body,
        (await http().get(`/api/public/celebrations/${announced.occurrenceId}`)).body,
        (await http().get(`/api/public/celebrations/${announced.secondOccurrenceId}`)).body,
        (await http().get('/api/public/parishes').query({ q: 'Notre-Dame des Pubs' })).body,
      ];
      for (const body of bodies) {
        expect(JSON.stringify(body)).not.toContain('SECRET-NOTE');
        expect(JSON.stringify(body)).not.toContain('internalNote');
      }
    });

    it('annoncer / retirer l’annonce de la série change la visibilité de toutes ses dates', async () => {
      await admin.patch(`/api/celebrations/${draft.id}`).send({ announced: true }).expect(200);
      await http().get(`/api/public/celebrations/${draft.occurrenceId}`).expect(200);
      await admin.patch(`/api/celebrations/${draft.id}`).send({ announced: false }).expect(200);
      await http().get(`/api/public/celebrations/${draft.occurrenceId}`).expect(404);
    });

    it('une date annulée reste affichée comme annulée, sans déroulement, et n’est plus « la prochaine »', async () => {
      await admin
        .post(`/api/occurrences/${announced.occurrenceId}/cancel`)
        .send({ reason: 'Pèlerinage diocésain' })
        .expect(201);

      const list = await http().get(`/api/public/parishes/${parishId}/celebrations`).expect(200);
      const cancelled = list.body.find((c: { id: string }) => c.id === announced.occurrenceId);
      expect(cancelled).toMatchObject({ cancelled: true, cancelReason: 'Pèlerinage diocésain' });
      const page = await http()
        .get(`/api/public/celebrations/${announced.occurrenceId}`)
        .expect(200);
      expect(page.body).toMatchObject({ cancelled: true, steps: [] });

      const search = await http().get('/api/public/parishes').query({ q: 'Notre-Dame des Pubs' });
      expect(search.body.items[0].nextCelebration.id).toBe(published.occurrenceId);

      await admin.post(`/api/occurrences/${announced.occurrenceId}/reinstate`).expect(201);
      const back = await http()
        .get(`/api/public/celebrations/${announced.occurrenceId}`)
        .expect(200);
      expect(back.body).toMatchObject({ cancelled: false, cancelReason: null });
    });

    it('dépublier la feuille la remet « en préparation »', async () => {
      await admin.post(`/api/sheets/${published.sheetId}/unpublish`).expect(201);
      const res = await http()
        .get(`/api/public/celebrations/${published.occurrenceId}`)
        .expect(200);
      expect(res.body).toMatchObject({ sheetStatus: 'IN_PREPARATION', steps: [] });
      await admin.post(`/api/sheets/${published.sheetId}/publish`).expect(201);
    });

    it('l’archivage de la série retire toutes ses dates', async () => {
      await admin.post(`/api/celebrations/${announced.id}/archive`).expect(201);
      await http().get(`/api/public/celebrations/${announced.occurrenceId}`).expect(404);
      await http().get(`/api/public/celebrations/${announced.secondOccurrenceId}`).expect(404);
      const list = await http().get(`/api/public/parishes/${parishId}/celebrations`).expect(200);
      expect(ids(list.body)).toEqual([published.occurrenceId]);
    });
  });

  describe('calendrier', () => {
    const monthOf = (days: number) => inDays(days).slice(0, 7);

    it('liste les dates visibles d’un mois, passées et annulées comprises, jamais celles d’une série non annoncée', async () => {
      const month = monthOf(4);
      const res = await http()
        .get(`/api/public/parishes/${parishId}/calendar`)
        .query({ month })
        .expect(200);
      expect(res.body).toMatchObject({ month, timezone: 'Europe/Paris' });
      const titles = res.body.items.map((c: { title: string }) => c.title);
      expect(titles).toContain('Messe publiée');
      expect(titles).not.toContain('Messe brouillon secrète');
      expect(JSON.stringify(res.body)).not.toContain('SECRET-NOTE');
      const dates = res.body.items.map((c: { date: string }) => c.date);
      expect([...dates].sort()).toEqual(dates);
    });

    it('inclut les dates passées (historique) du mois', async () => {
      const res = await http()
        .get(`/api/public/parishes/${parishId}/calendar`)
        .query({ month: monthOf(-5) })
        .expect(200);
      expect(res.body.items.map((c: { title: string }) => c.title)).toContain('Messe passée');
    });

    it('un mois sans célébration renvoie une liste vide', async () => {
      const res = await http()
        .get(`/api/public/parishes/${parishId}/calendar`)
        .query({ month: '2031-01' })
        .expect(200);
      expect(res.body.items).toEqual([]);
    });

    it('sans mois : le mois courant', async () => {
      const res = await http().get(`/api/public/parishes/${parishId}/calendar`).expect(200);
      expect(res.body.month).toBe(new Date().toISOString().slice(0, 7));
    });

    it('valide le mois (400) et la paroisse (404)', async () => {
      for (const month of ['2026-13', 'octobre', '1999-01']) {
        await http().get(`/api/public/parishes/${parishId}/calendar`).query({ month }).expect(400);
      }
      await http().get('/api/public/parishes/inconnue/calendar').expect(404);
    });

    it('les dates d’une série archivée disparaissent du calendrier', async () => {
      const series = await createSeries('Série du calendrier', [5], { announced: true });
      const month = monthOf(5);
      const before = await http().get(`/api/public/parishes/${parishId}/calendar`).query({ month });
      expect(before.body.items.map((c: { title: string }) => c.title)).toContain(
        'Série du calendrier',
      );
      await admin.post(`/api/celebrations/${series.id}/archive`).expect(201);
      const after = await http().get(`/api/public/parishes/${parishId}/calendar`).query({ month });
      expect(after.body.items.map((c: { title: string }) => c.title)).not.toContain(
        'Série du calendrier',
      );
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

    it('texte riche : HTML nettoyé, images inline conservées, ancien texte brut converti', async () => {
      const png = 'data:image/png;base64,iVBORw0KGgo=';
      const created = await admin
        .post(`/api/parishes/${parishId}/activities`)
        .send({
          title: 'Riche',
          description: `<p onclick="x()"><strong>Gras</strong><script>alert(1)</script></p><img src="${png}" data-width="50"><img src="javascript:alert(1)">`,
          startsAt: inDays(2),
        })
        .expect(201);
      await admin
        .post(`/api/parishes/${parishId}/announcements`)
        .send({ title: 'Brut', body: 'Ligne 1\nLigne 2 <b>' })
        .expect(201);
      // image seule (sans texte) : contenu valide
      await admin
        .post(`/api/parishes/${parishId}/announcements`)
        .send({ title: 'Image', body: `<img src="${png}">` })
        .expect(201);

      const acts = await http().get(`/api/public/parishes/${parishId}/activities`).expect(200);
      const rich = acts.body.find((a: { title: string }) => a.title === 'Riche');
      expect(rich.description).toBe(
        `<p><strong>Gras</strong></p><img src="${png}" data-width="50" />`,
      );
      await admin.delete(`/api/parishes/${parishId}/activities/${created.body.id}`).expect(200);
      const anns = await http().get(`/api/public/parishes/${parishId}/announcements`).expect(200);
      const plain = anns.body.find((a: { title: string }) => a.title === 'Brut');
      expect(plain.body).toBe('<p>Ligne 1<br />Ligne 2 &lt;b&gt;</p>');
    });

    it('accepte un corps de plus de 100 ko (images) mais refuse un contenu trop volumineux', async () => {
      const big = `<p>x</p><img src="data:image/png;base64,${'A'.repeat(300_000)}">`;
      await admin
        .post(`/api/parishes/${parishId}/announcements`)
        .send({ title: 'Grosse', body: big })
        .expect(201);
      await admin
        .post(`/api/parishes/${parishId}/announcements`)
        .send({ title: 'Énorme', body: `<p>${'x'.repeat(1_600_000)}</p>` })
        .expect(400);
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
