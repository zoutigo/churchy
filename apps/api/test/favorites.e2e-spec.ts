import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MAX_FAVORITE_PARISHES } from '@churchy/shared';
import { Agent, createTestApp, newAgent, registerAgent } from './helpers';

/** Favoris : résumés publics par ids (visiteur) et favoris persistés du compte connecté. */
describe('Favoris de paroisses', () => {
  let app: INestApplication;
  let owner: Agent;
  let user: Agent;
  const parishIds: string[] = [];
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    owner = await registerAgent(app, 'fav-owner@test.fr');
    user = await registerAgent(app, 'fav-user@test.fr');
    for (let i = 0; i < MAX_FAVORITE_PARISHES + 2; i++) {
      const res = await owner
        .post('/api/parishes')
        .send({ name: `Paroisse favorite ${i}`, city: 'Lille', country: 'France' })
        .expect(201);
      parishIds.push(res.body.id);
    }
  });

  afterAll(() => app.close());

  describe('GET /public/parishes/summaries (sans compte)', () => {
    it('renvoie les résumés dans l’ordre demandé et ignore les ids inconnus', async () => {
      const [a, b] = parishIds;
      const res = await http()
        .get(`/api/public/parishes/summaries?ids=${b},ghost,${a}`)
        .expect(200);
      expect(res.body.map((p: { id: string }) => p.id)).toEqual([b, a]);
      expect(res.body[0]).toMatchObject({ name: 'Paroisse favorite 1', city: 'Lille' });
      expect(res.body[0]).not.toHaveProperty('timezone');
    });

    it('refuse plus de 10 ids (400)', async () => {
      await http()
        .get(`/api/public/parishes/summaries?ids=${parishIds.join(',')}`)
        .expect(400);
    });

    it('sans ids → 400', async () => {
      await http().get('/api/public/parishes/summaries').expect(400);
    });
  });

  describe('compte connecté', () => {
    it('exige une session', async () => {
      await http().get('/api/favorites').expect(401);
      await http().put(`/api/favorites/${parishIds[0]}`).expect(401);
      await http().post('/api/favorites/merge').send({ parishIds: [] }).expect(401);
    });

    it('ajoute (idempotent), liste dans l’ordre d’ajout, retire', async () => {
      const [a, b] = parishIds;
      await user.put(`/api/favorites/${a}`).expect(204);
      await user.put(`/api/favorites/${b}`).expect(204);
      await user.put(`/api/favorites/${a}`).expect(204);

      const list = await user.get('/api/favorites').expect(200);
      expect(list.body.map((p: { id: string }) => p.id)).toEqual([a, b]);

      await user.delete(`/api/favorites/${a}`).expect(204);
      await user.delete(`/api/favorites/${a}`).expect(204);
      const after = await user.get('/api/favorites').expect(200);
      expect(after.body.map((p: { id: string }) => p.id)).toEqual([b]);
      await user.delete(`/api/favorites/${b}`).expect(204);
    });

    it('404 pour une paroisse inconnue', async () => {
      await user.put('/api/favorites/ghost').expect(404);
    });

    it('les favoris sont propres à chaque compte', async () => {
      const other = await registerAgent(app, 'fav-other@test.fr');
      await user.put(`/api/favorites/${parishIds[0]}`).expect(204);
      const res = await other.get('/api/favorites').expect(200);
      expect(res.body).toEqual([]);
      await user.delete(`/api/favorites/${parishIds[0]}`).expect(204);
    });

    it(`refuse un favori au-delà de ${MAX_FAVORITE_PARISHES} (409) mais accepte un doublon`, async () => {
      const full = await registerAgent(app, 'fav-full@test.fr');
      for (const id of parishIds.slice(0, MAX_FAVORITE_PARISHES)) {
        await full.put(`/api/favorites/${id}`).expect(204);
      }
      await full.put(`/api/favorites/${parishIds[MAX_FAVORITE_PARISHES]}`).expect(409);
      await full.put(`/api/favorites/${parishIds[0]}`).expect(204);
    });

    it('fusionne les favoris d’un appareil : union, sans doublon ni paroisse inconnue', async () => {
      const merger = await registerAgent(app, 'fav-merge@test.fr');
      const [a, b, c] = parishIds;
      await merger.put(`/api/favorites/${a}`).expect(204);
      const res = await merger
        .post('/api/favorites/merge')
        .send({ parishIds: [c, a, 'ghost', b] })
        .expect(200);
      expect(res.body.map((p: { id: string }) => p.id)).toEqual([a, c, b]);
    });

    it('la fusion respecte la limite et refuse une liste trop longue', async () => {
      const merger = await registerAgent(app, 'fav-merge2@test.fr');
      await merger.post('/api/favorites/merge').send({ parishIds }).expect(400);
      const res = await merger
        .post('/api/favorites/merge')
        .send({ parishIds: parishIds.slice(0, MAX_FAVORITE_PARISHES) })
        .expect(200);
      expect(res.body).toHaveLength(MAX_FAVORITE_PARISHES);
    });
  });

  it('un visiteur sans cookie ne voit aucun favori de compte', async () => {
    await newAgent(app).get('/api/favorites').expect(401);
  });
});
