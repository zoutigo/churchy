import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
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
        expect.objectContaining({ id: created.body.id, role: 'PARISH_ADMIN' }),
      ]);

      const publicList = await http().get('/api/public/parishes?q=saint%20pierre').expect(200);
      expect(publicList.body.items.map((p: { id: string }) => p.id)).toContain(created.body.id);
    });
  });

  describe('cycle de vie d’une célébration', () => {
    let agent: ReturnType<typeof newAgent>;
    let parishId: string;
    let celebrationId: string;
    // Date relative : le test ne doit pas dépendre du jour où il est lancé.
    const inTwoDays = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();

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
      const celebration = await agent
        .post(`/api/parishes/${parishId}/celebrations`)
        .send({
          templateId: tpl.body.id,
          title: 'Messe du dimanche',
          date: inTwoDays,
        })
        .expect(201);
      celebrationId = celebration.body.id;
    });

    it('reste invisible publiquement tant qu’elle est en brouillon', async () => {
      const res = await http().get(`/api/public/parishes/${parishId}/celebrations`).expect(200);
      expect(res.body).toEqual([]);
      await http().get(`/api/public/celebrations/${celebrationId}`).expect(404);
    });

    it('se publie, devient publique et enfile un job de notification', async () => {
      await agent.post(`/api/celebrations/${celebrationId}/publish`).expect(201);

      const pub = await http().get(`/api/public/parishes/${parishId}/celebrations`).expect(200);
      expect(pub.body.map((c: { id: string }) => c.id)).toEqual([celebrationId]);
      await http().get(`/api/public/celebrations/${celebrationId}`).expect(200);

      const jobs = await queue.getJobs(['waiting', 'delayed', 'active', 'completed']);
      const job = jobs.find((j) => j.name === 'celebration.published');
      expect(job?.data).toMatchObject({ celebrationId, parishId, title: 'Messe du dimanche' });
    });

    it('refuse de republier (400)', async () => {
      await agent.post(`/api/celebrations/${celebrationId}/publish`).expect(400);
    });

    it('n’est plus publique une fois archivée', async () => {
      await agent.post(`/api/celebrations/${celebrationId}/archive`).expect(201);
      await http().get(`/api/public/celebrations/${celebrationId}`).expect(404);
    });
  });
});
