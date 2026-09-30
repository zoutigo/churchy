import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import * as request from 'supertest';
import { QUEUES } from '@churchy/contracts';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('API (fonctionnel, vraie base churchy_test)', () => {
  let app: INestApplication;
  let queue: Queue;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const register = async (email: string) => {
    const res = await http()
      .post('/api/auth/register')
      .send({ email, password: 'password123', firstName: 'Jean', lastName: 'Dupont' })
      .expect(201);
    return res.body.tokens.accessToken as string;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    queue = new Queue(QUEUES.NOTIFICATIONS, {
      connection: { host: 'localhost', port: Number(process.env.REDIS_PORT ?? 6380), db: 15 },
    });
    await queue.obliterate({ force: true });
  });

  afterAll(async () => {
    await queue.obliterate({ force: true });
    await queue.close();
    await app.close();
  });

  it('GET /api/health', async () => {
    await http()
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('ok'));
  });

  describe('authentification', () => {
    it('inscrit, refuse le doublon, puis connecte', async () => {
      await register('auth@test.fr');
      await http()
        .post('/api/auth/register')
        .send({ email: 'auth@test.fr', password: 'password123', firstName: 'A', lastName: 'B' })
        .expect(409);
      const res = await http()
        .post('/api/auth/login')
        .send({ email: 'auth@test.fr', password: 'password123' })
        .expect(201);
      expect(res.body.tokens.accessToken).toEqual(expect.any(String));
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('refuse un mauvais mot de passe (401) et une entrée invalide (400)', async () => {
      await http()
        .post('/api/auth/login')
        .send({ email: 'auth@test.fr', password: 'faux' })
        .expect(401);
      await http().post('/api/auth/register').send({ email: 'nope' }).expect(400);
    });

    it('protège /auth/me par jeton', async () => {
      const token = await register('me@test.fr');
      await http().get('/api/auth/me').expect(401);
      const res = await http().get('/api/auth/me').set(auth(token)).expect(200);
      expect(res.body.email).toBe('me@test.fr');
    });
  });

  describe('paroisses', () => {
    it('crée une paroisse (créateur = PARISH_ADMIN), la liste et l’expose publiquement', async () => {
      const token = await register('parish@test.fr');
      await http()
        .post('/api/parishes')
        .send({ name: 'Saint Pierre', city: 'Douala', country: 'CM' })
        .expect(401);
      await http().post('/api/parishes').set(auth(token)).send({ name: 'x' }).expect(400);

      const created = await http()
        .post('/api/parishes')
        .set(auth(token))
        .send({ name: 'Saint Pierre', city: 'Douala', country: 'Cameroun' })
        .expect(201);
      expect(created.body.slug).toBe('saint-pierre');

      const mine = await http().get('/api/parishes/my').set(auth(token)).expect(200);
      expect(mine.body).toEqual([
        expect.objectContaining({ id: created.body.id, role: 'PARISH_ADMIN' }),
      ]);

      const publicList = await http().get('/api/public/parishes').expect(200);
      expect(publicList.body.map((p: any) => p.slug)).toContain('saint-pierre');
    });
  });

  describe('cycle de vie d’une célébration', () => {
    let token: string;
    let parishId: string;
    let celebrationId: string;

    beforeAll(async () => {
      token = await register('celebrant@test.fr');
      const parish = await http()
        .post('/api/parishes')
        .set(auth(token))
        .send({ name: 'Notre Dame', city: 'Paris', country: 'France' });
      parishId = parish.body.id;
      const tpl = await http()
        .post(`/api/parishes/${parishId}/templates`)
        .set(auth(token))
        .send({ name: 'Messe dominicale', type: 'SUNDAY_MASS' })
        .expect(201);
      const celebration = await http()
        .post(`/api/parishes/${parishId}/celebrations`)
        .set(auth(token))
        .send({
          templateId: tpl.body.id,
          title: 'Messe du dimanche',
          date: '2026-10-04T09:00:00.000Z',
        })
        .expect(201);
      celebrationId = celebration.body.id;
    });

    it('reste invisible publiquement tant qu’elle est en brouillon', async () => {
      const res = await http().get('/api/public/parishes/notre-dame/celebrations').expect(200);
      expect(res.body).toEqual([]);
      await http().get(`/api/public/celebrations/${celebrationId}`).expect(404);
    });

    it('se publie, devient publique et enfile un job de notification', async () => {
      await http().post(`/api/celebrations/${celebrationId}/publish`).set(auth(token)).expect(201);

      const pub = await http().get('/api/public/parishes/notre-dame/celebrations').expect(200);
      expect(pub.body.map((c: any) => c.id)).toEqual([celebrationId]);
      await http().get(`/api/public/celebrations/${celebrationId}`).expect(200);

      const jobs = await queue.getJobs(['waiting', 'delayed', 'active', 'completed']);
      expect(jobs.map((j) => j.name)).toContain('celebration.published');
      expect(jobs.find((j) => j.name === 'celebration.published')?.data).toMatchObject({
        celebrationId,
        parishId,
        title: 'Messe du dimanche',
      });
    });

    it('refuse de republier (400)', async () => {
      await http().post(`/api/celebrations/${celebrationId}/publish`).set(auth(token)).expect(400);
    });

    it('n’est plus publique une fois archivée', async () => {
      await http().post(`/api/celebrations/${celebrationId}/archive`).set(auth(token)).expect(201);
      await http().get(`/api/public/celebrations/${celebrationId}`).expect(404);
    });
  });

  describe('autorisations par paroisse', () => {
    // FAILING ATTENDU — faille connue : aucun contrôleur n'applique ParishRolesGuard, donc un
    // utilisateur connecté mais non membre peut publier la célébration d'une autre paroisse.
    // Quand la faille sera corrigée, ce test échouera : retirer alors `.failing`.
    it.failing(
      'un non-membre ne doit pas pouvoir publier la célébration d’une autre paroisse',
      async () => {
        const owner = await register('owner@test.fr');
        const stranger = await register('stranger@test.fr');
        const parish = await http()
          .post('/api/parishes')
          .set(auth(owner))
          .send({ name: 'Sainte Anne', city: 'Lyon', country: 'France' });
        const tpl = await http()
          .post(`/api/parishes/${parish.body.id}/templates`)
          .set(auth(owner))
          .send({ name: 'Messe', type: 'SUNDAY_MASS' });
        const celebration = await http()
          .post(`/api/parishes/${parish.body.id}/celebrations`)
          .set(auth(owner))
          .send({ templateId: tpl.body.id, title: 'Messe', date: '2026-10-11T09:00:00.000Z' });

        await http()
          .post(`/api/celebrations/${celebration.body.id}/publish`)
          .set(auth(stranger))
          .expect(403);
      },
    );
  });
});
