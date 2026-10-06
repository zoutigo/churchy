import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, newAgent, openNotificationsQueue, registerAgent } from './helpers';

describe('API — parcours principaux (vraie base churchy_test)', () => {
  let app: INestApplication;
  let queue: Queue;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    queue = openNotificationsQueue();
    await queue.obliterate({ force: true });
  });

  afterAll(async () => {
    await queue.obliterate({ force: true });
    await queue.close();
    await app.close();
  });

  describe('santé et en-têtes de sécurité', () => {
    it('GET /api/health', async () => {
      const res = await http().get('/api/health').expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('envoie les en-têtes de sécurité (helmet) et masque la technologie', async () => {
      const res = await http().get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('autorise le site web (avec cookies) et aucune autre origine', async () => {
      const allowed = await http()
        .options('/api/auth/login')
        .set('Origin', process.env.FRONTEND_URL as string)
        .set('Access-Control-Request-Method', 'POST');
      expect(allowed.headers['access-control-allow-origin']).toBe(process.env.FRONTEND_URL);
      expect(allowed.headers['access-control-allow-credentials']).toBe('true');

      const denied = await http()
        .options('/api/auth/login')
        .set('Origin', 'https://evil.example')
        .set('Access-Control-Request-Method', 'POST');
      // Origine statique : le serveur ne reflète jamais l'origine demandée ; le navigateur bloquera.
      expect(denied.headers['access-control-allow-origin']).not.toBe('https://evil.example');
    });
  });

  describe('paroisses', () => {
    it('crée une paroisse (créateur = PARISH_ADMIN), la liste et l’expose publiquement', async () => {
      const agent = await registerAgent(app, 'parish@test.fr');
      await http()
        .post('/api/parishes')
        .send({ name: 'Saint Pierre', city: 'Douala', country: 'CM' })
        .expect(401);
      await agent.post('/api/parishes').send({ name: 'x' }).expect(400);

      const created = await agent
        .post('/api/parishes')
        .send({ name: 'Saint Pierre', city: 'Douala', country: 'Cameroun' })
        .expect(201);
      expect(created.body.slug).toBe('saint-pierre');

      const mine = await agent.get('/api/parishes/my').expect(200);
      expect(mine.body).toEqual([
        expect.objectContaining({ id: created.body.id, status: 'PARISH_ADMIN', duties: [] }),
      ]);

      const publicList = await http().get('/api/public/parishes?q=saint%20pierre').expect(200);
      expect(publicList.body.items.map((p: { id: string }) => p.id)).toContain(created.body.id);
    });
  });

  describe('cycle de vie d’une série de célébrations', () => {
    let agent: ReturnType<typeof newAgent>;
    let parishId: string;
    let templateId: string;
    let celebrationId: string;
    let occurrenceIds: string[];
    let sheetId: string;

    beforeAll(async () => {
      agent = await registerAgent(app, 'celebrant@test.fr');
      const parish = await agent
        .post('/api/parishes')
        .send({ name: 'Notre Dame', city: 'Paris', country: 'France' });
      parishId = parish.body.id;
      const tpl = await agent
        .post(`/api/parishes/${parishId}/templates`)
        .send({ name: 'Messe dominicale', type: 'SUNDAY_MASS' })
        .expect(201);
      templateId = tpl.body.id;
      for (const [order, key] of ['entrance', 'psalm'].entries()) {
        await agent
          .post(`/api/templates/${templateId}/steps`)
          .send({ title: key, key, order: order + 1 })
          .expect(201);
      }
    });

    it('le fuseau de la paroisse suit son pays', async () => {
      const france = await agent.get(`/api/parishes/${parishId}`).expect(200);
      expect(france.body.timezone).toBe('Europe/Paris');
      const cameroun = await agent
        .post('/api/parishes')
        .send({ name: 'Saint Joseph', city: 'Douala', country: 'Cameroun' })
        .expect(201);
      expect(cameroun.body.timezone).toBe('Africa/Douala');
    });

    it('crée une série récurrente : une date par dimanche, à l’heure locale, sans feuille', async () => {
      const start = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
      const end = new Date(Date.now() + 22 * 86_400_000).toISOString().slice(0, 10);
      const res = await agent
        .post(`/api/parishes/${parishId}/celebrations`)
        .send({
          title: 'Messe du dimanche',
          type: 'SUNDAY_MASS',
          templateId,
          description: '<p>Bienvenue à tous</p>',
          internalNote: 'Penser au micro',
          schedule: {
            kind: 'recurrence',
            startDate: start,
            endDate: end,
            time: '10:00',
            weekdays: [0, 3],
          },
        })
        .expect(201);
      celebrationId = res.body.id;
      occurrenceIds = res.body.occurrences.map((o: { id: string }) => o.id);

      expect(res.body).toMatchObject({
        title: 'Messe du dimanche',
        announced: false,
        timezone: 'Europe/Paris',
        defaultTemplate: { id: templateId, name: 'Messe dominicale' },
        internalNote: 'Penser au micro',
      });
      // Dimanches et mercredis entre demain et J+22 : au moins 6 dates, toutes à 10 h à Paris.
      expect(occurrenceIds.length).toBeGreaterThanOrEqual(6);
      for (const o of res.body.occurrences) {
        const local = new Intl.DateTimeFormat('fr-FR', {
          timeZone: 'Europe/Paris',
          hour: '2-digit',
          minute: '2-digit',
          weekday: 'long',
        }).format(new Date(o.startsAt));
        expect(local).toMatch(/^(dimanche|mercredi) 10:00$/);
        expect(o.sheet).toBeNull();
        expect(o.isPast).toBe(false);
      }
    });

    it('refuse le passé, au-delà d’un an et un planning vide, avec l’erreur sous le champ « schedule »', async () => {
      const send = (schedule: unknown) =>
        agent
          .post(`/api/parishes/${parishId}/celebrations`)
          .send({ title: 'X', type: 'OTHER', schedule });
      const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

      const past = await send({ kind: 'dates', dates: [{ date: day(-2), time: '10:00' }] }).expect(
        400,
      );
      expect(past.body.message.fieldErrors.schedule[0]).toEqual('schedulePast');
      const far = await send({ kind: 'dates', dates: [{ date: day(400), time: '10:00' }] }).expect(
        400,
      );
      expect(far.body.message.fieldErrors.schedule[0]).toEqual('scheduleTooFar');
      const empty = await send({
        kind: 'recurrence',
        startDate: day(1),
        endDate: day(1),
        time: '10:00',
        weekdays: [],
      }).expect(400);
      expect(empty.body.message.fieldErrors.schedule).toBeDefined();
      await send({ kind: 'dates', dates: [{ date: '2026-02-31', time: '10:00' }] }).expect(400);
    });

    it('accepte une date proche du plafond d’un an', async () => {
      const inOneYearMinus = new Date(Date.now() + 364 * 86_400_000).toISOString().slice(0, 10);
      await agent
        .post(`/api/parishes/${parishId}/celebrations`)
        .send({
          title: 'Dans un an',
          type: 'OTHER',
          schedule: { kind: 'dates', dates: [{ date: inOneYearMinus, time: '10:00' }] },
        })
        .expect(201);
    });

    it('reste invisible publiquement tant que la série n’est pas annoncée', async () => {
      const res = await http().get(`/api/public/parishes/${parishId}/celebrations`).expect(200);
      expect(res.body).toEqual([]);
      await http().get(`/api/public/celebrations/${occurrenceIds[0]}`).expect(404);
    });

    it('annoncer la série rend TOUTES ses dates publiques, en préparation', async () => {
      await agent.patch(`/api/celebrations/${celebrationId}`).send({ announced: true }).expect(200);
      const pub = await http().get(`/api/public/parishes/${parishId}/celebrations`).expect(200);
      expect(pub.body.map((c: { id: string }) => c.id)).toEqual(occurrenceIds);
      expect(
        pub.body.every((c: { sheetStatus: string }) => c.sheetStatus === 'IN_PREPARATION'),
      ).toBe(true);
    });

    it('la feuille d’une date naît à la demande, depuis le modèle par défaut', async () => {
      const sheet = await agent
        .post(`/api/occurrences/${occurrenceIds[0]}/sheet`)
        .send({})
        .expect(201);
      sheetId = sheet.body.id;
      expect(sheet.body.templateId).toBe(templateId);
      expect(sheet.body.steps.map((s: { key: string }) => s.key)).toEqual(['entrance', 'psalm']);
      // Idempotent : une seconde demande renvoie la même feuille.
      const again = await agent
        .post(`/api/occurrences/${occurrenceIds[0]}/sheet`)
        .send({})
        .expect(201);
      expect(again.body.id).toBe(sheetId);
      // Les autres dates n'ont pas de feuille.
      const detail = await agent.get(`/api/celebrations/${celebrationId}`).expect(200);
      expect(detail.body.occurrences.filter((o: { sheet: unknown }) => o.sheet).length).toBe(1);
    });

    it('une autre date peut avoir une feuille à la volée, puis un modèle', async () => {
      const blank = await agent
        .post(`/api/occurrences/${occurrenceIds[1]}/sheet`)
        .send({ templateId: null })
        .expect(201);
      expect(blank.body.templateId).toBeNull();
      expect(blank.body.steps).toEqual([]);
      const added = await agent
        .post(`/api/sheets/${blank.body.id}/steps`)
        .send({ title: 'Chant à Marie' })
        .expect(201);
      expect(added.body.steps[0]).toMatchObject({ title: 'Chant à Marie', templateStepId: null });
      await agent
        .patch(`/api/sheets/${blank.body.id}/steps/${added.body.steps[0].id}`)
        .send({ customText: 'Ave Maria' })
        .expect(200);

      // Passer au modèle : la feuille se complète, le chant déjà saisi n'est pas perdu.
      const preview = await agent
        .patch(`/api/sheets/${blank.body.id}/template`)
        .send({ templateId, dryRun: true })
        .expect(200);
      expect(preview.body.applied).toBe(false);
      expect(preview.body.report.added.map((s: { key: string }) => s.key)).toEqual([
        'entrance',
        'psalm',
      ]);
      const applied = await agent
        .patch(`/api/sheets/${blank.body.id}/template`)
        .send({ templateId })
        .expect(200);
      const titles = applied.body.sheet.steps.map((s: { title: string }) => s.title);
      expect(titles).toEqual(['entrance', 'psalm', 'Chant à Marie']);
      expect(applied.body.sheet.steps[2].customText).toBe('Ave Maria');
    });

    it('changer de modèle conserve le contenu des étapes de même clé', async () => {
      const content = await agent
        .post(`/api/parishes/${parishId}/contents`)
        .send({ title: 'Chant d’entrée', type: 'SONG', body: 'Paroles' })
        .expect(201);
      const sheet = await agent.get(`/api/sheets/${sheetId}`).expect(200);
      const entrance = sheet.body.steps.find((s: { key: string }) => s.key === 'entrance');
      await agent
        .patch(`/api/sheets/${sheetId}/steps/${entrance.id}`)
        .send({ contentId: content.body.id })
        .expect(200);

      const other = await agent
        .post(`/api/parishes/${parishId}/templates`)
        .send({ name: 'Messe courte', type: 'WEEKDAY_MASS' })
        .expect(201);
      await agent
        .post(`/api/templates/${other.body.id}/steps`)
        .send({ title: 'Chant d’entrée', key: 'entrance', order: 1 })
        .expect(201);
      await agent
        .post(`/api/templates/${other.body.id}/steps`)
        .send({ title: 'Envoi', key: 'sending', order: 2 })
        .expect(201);

      const res = await agent
        .patch(`/api/sheets/${sheetId}/template`)
        .send({ templateId: other.body.id })
        .expect(200);
      expect(res.body.report).toMatchObject({
        kept: [{ key: 'entrance' }],
        added: [{ key: 'sending' }],
        removed: [{ key: 'psalm' }], // vide : retirée
      });
      const kept = res.body.sheet.steps.find((s: { key: string }) => s.key === 'entrance');
      expect(kept.contentId).toBe(content.body.id);
      expect(res.body.sheet.templateId).toBe(other.body.id);
    });

    it('publier la feuille d’une date la rend disponible et enfile une notification pour cette date', async () => {
      await agent.post(`/api/sheets/${sheetId}/publish`).expect(201);
      await agent.post(`/api/sheets/${sheetId}/publish`).expect(400);

      const page = await http().get(`/api/public/celebrations/${occurrenceIds[0]}`).expect(200);
      expect(page.body.sheetStatus).toBe('AVAILABLE');
      const other = await http().get(`/api/public/celebrations/${occurrenceIds[2]}`).expect(200);
      expect(other.body.sheetStatus).toBe('IN_PREPARATION');

      const jobs = await queue.getJobs(['waiting', 'delayed', 'active', 'completed']);
      const published = jobs.filter((j) => j.name === 'celebration.published');
      expect(published).toHaveLength(1);
      expect(published[0].data).toMatchObject({
        celebrationId,
        occurrenceId: occurrenceIds[0],
        parishId,
        title: 'Messe du dimanche',
      });
    });

    it('déplace une date (heure locale) et refuse de la déplacer vers le passé', async () => {
      const day = new Date(Date.now() + 25 * 86_400_000).toISOString().slice(0, 10);
      const moved = await agent
        .patch(`/api/occurrences/${occurrenceIds[2]}`)
        .send({ start: { date: day, time: '18:30' } })
        .expect(200);
      const local = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(moved.body.startsAt));
      expect(local).toBe('18:30');
      await agent
        .patch(`/api/occurrences/${occurrenceIds[2]}`)
        .send({ start: { date: '2020-01-01', time: '10:00' } })
        .expect(400);
    });

    it('prolonge la série avec de nouvelles dates, sans doubler celles qui existent', async () => {
      const before = await agent.get(`/api/celebrations/${celebrationId}`).expect(200);
      const first = before.body.occurrences[0].startsAt as string;
      const firstLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
        new Date(first),
      );
      const res = await agent
        .post(`/api/celebrations/${celebrationId}/occurrences`)
        .send({
          schedule: {
            kind: 'dates',
            dates: [
              { date: firstLocal, time: '10:00' }, // déjà présente
              {
                date: new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10),
                time: '10:00',
              },
            ],
          },
        })
        .expect(201);
      expect(res.body.occurrences.length).toBe(before.body.occurrences.length + 1);
    });

    it('signale la fin de série proche (rappel un mois avant)', async () => {
      const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
      const res = await agent
        .post(`/api/parishes/${parishId}/celebrations`)
        .send({
          title: 'Série qui se termine',
          type: 'WEEKDAY_MASS',
          schedule: { kind: 'dates', dates: [{ date: soon, time: '07:00' }] },
        })
        .expect(201);
      expect(res.body.endingSoon).toBe(true);
      const list = await agent.get(`/api/parishes/${parishId}/celebrations`).expect(200);
      const item = list.body.find((c: { id: string }) => c.id === res.body.id);
      expect(item.endingSoon).toBe(true);
      const long = list.body.find((c: { id: string }) => c.id === celebrationId);
      expect(long.endingSoon).toBe(false);
    });

    it('n’est plus publique une fois la série archivée, et redevient visible une fois désarchivée', async () => {
      await agent.post(`/api/celebrations/${celebrationId}/archive`).expect(201);
      await http().get(`/api/public/celebrations/${occurrenceIds[0]}`).expect(404);
      await agent.post(`/api/celebrations/${celebrationId}/unarchive`).expect(201);
      await http().get(`/api/public/celebrations/${occurrenceIds[0]}`).expect(200);
    });
  });

  describe('le passé est immuable', () => {
    it('refuse (409) toute modification d’une date passée et de sa feuille', async () => {
      const agent = await registerAgent(app, 'histoire@test.fr');
      const parish = await agent
        .post('/api/parishes')
        .send({ name: 'Saint Jean', city: 'Lyon', country: 'France' })
        .expect(201);
      const day = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
      const series = await agent
        .post(`/api/parishes/${parish.body.id}/celebrations`)
        .send({
          title: 'Messe d’hier',
          type: 'SUNDAY_MASS',
          schedule: { kind: 'dates', dates: [{ date: day, time: '10:00' }] },
        })
        .expect(201);
      const occurrenceId = series.body.occurrences[0].id as string;
      const sheet = await agent.post(`/api/occurrences/${occurrenceId}/sheet`).send({}).expect(201);
      const step = await agent
        .post(`/api/sheets/${sheet.body.id}/steps`)
        .send({ title: 'Chant' })
        .expect(201);
      const stepId = step.body.steps[0].id as string;

      // On fait « passer » la date : elle a maintenant commencé.
      await app.get(PrismaService).celebrationOccurrence.update({
        where: { id: occurrenceId },
        data: { startsAt: new Date(Date.now() - 3600_000) },
      });

      await agent.patch(`/api/occurrences/${occurrenceId}`).send({ internalNote: 'x' }).expect(409);
      await agent.post(`/api/occurrences/${occurrenceId}/cancel`).send({}).expect(409);
      await agent.post(`/api/occurrences/${occurrenceId}/reinstate`).expect(409);
      await agent.post(`/api/sheets/${sheet.body.id}/publish`).expect(409);
      await agent.post(`/api/sheets/${sheet.body.id}/steps`).send({ title: 'Autre' }).expect(409);
      await agent
        .patch(`/api/sheets/${sheet.body.id}/steps/${stepId}`)
        .send({ customText: 'Réécrit' })
        .expect(409);
      await agent.delete(`/api/sheets/${sheet.body.id}/steps/${stepId}`).expect(409);
      await agent
        .patch(`/api/sheets/${sheet.body.id}/template`)
        .send({ templateId: null })
        .expect(409);
      await agent
        .patch(`/api/celebrations/${series.body.id}`)
        .send({ title: 'Réécrite' })
        .expect(409);

      // Lecture toujours possible, rien n'a changé.
      const read = await agent.get(`/api/occurrences/${occurrenceId}`).expect(200);
      expect(read.body).toMatchObject({ isPast: true, status: 'SCHEDULED' });
      expect(read.body.sheet.steps[0].customText).toBeNull();
    });
  });
});
