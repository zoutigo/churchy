import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { Agent, createTestApp, newAgent, registerAgent } from './helpers';

/** Devenir fidèle, se retirer, et la gestion des membres par l'administrateur de la paroisse. */
describe('Fidèles, paroissiens et responsabilités', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let parishId: string;

  const idOf = async (agent: Agent) =>
    (await agent.get('/api/auth/me').expect(200)).body.id as string;
  const members = (agent: Agent, qs = '') => agent.get(`/api/parishes/${parishId}/members${qs}`);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    admin = await registerAgent(app, 'mem-admin@test.fr');
    parishId = (
      await admin
        .post('/api/parishes')
        .send({ name: 'Paroisse Membres', city: 'Douala', country: 'Cameroun' })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('devenir fidèle', () => {
    it('refuse un visiteur anonyme', async () => {
      await request(app.getHttpServer()).post(`/api/parishes/${parishId}/follow`).expect(401);
    });

    it('sans validation, et c’est idempotent', async () => {
      const user = await registerAgent(app, 'mem-follow@test.fr');
      expect((await user.get(`/api/parishes/${parishId}/membership`).expect(200)).body).toEqual({
        status: null,
        duties: [],
      });
      const first = await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      expect(first.body).toEqual({ status: 'FAITHFUL', duties: [] });
      await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      expect(
        await prisma.parishMember.count({ where: { parishId, userId: await idOf(user) } }),
      ).toBe(1);
      expect((await user.get('/api/parishes/my').expect(200)).body[0]).toMatchObject({
        id: parishId,
        status: 'FAITHFUL',
      });
    });

    it('404 pour une paroisse inconnue', async () => {
      const user = await registerAgent(app, 'mem-follow404@test.fr');
      await user.post('/api/parishes/inconnue/follow').expect(404);
    });

    it('un fidèle ne voit rien d’interne', async () => {
      const user = await registerAgent(app, 'mem-nointernal@test.fr');
      await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      await user.get(`/api/parishes/${parishId}/celebrations`).expect(403);
      await user.get(`/api/parishes/${parishId}/contents`).expect(403);
      await user.get(`/api/parishes/${parishId}/templates`).expect(403);
      await user.get(`/api/parishes/${parishId}`).expect(200);
    });

    it('limite le nombre de paroisses suivies à 20', async () => {
      const user = await registerAgent(app, 'mem-limit@test.fr');
      const owner = await registerAgent(app, 'mem-limit-owner@test.fr');
      const ids: string[] = [];
      for (let i = 0; i < 21; i++) {
        ids.push(
          (
            await owner
              .post('/api/parishes')
              .send({ name: `Paroisse limite ${i}`, city: 'Douala', country: 'Cameroun' })
              .expect(201)
          ).body.id,
        );
      }
      for (const id of ids.slice(0, 20)) await user.post(`/api/parishes/${id}/follow`).expect(201);
      const res = await user.post(`/api/parishes/${ids[20]}/follow`).expect(409);
      expect(res.body.message.message ?? res.body.message).toBe('parishFollowLimit');
      // Une paroisse déjà suivie reste accessible : pas de blocage.
      await user.post(`/api/parishes/${ids[0]}/follow`).expect(201);
    });
  });

  describe('se retirer', () => {
    it('un fidèle quitte la paroisse', async () => {
      const user = await registerAgent(app, 'mem-leave@test.fr');
      await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      const res = await user.delete(`/api/parishes/${parishId}/follow`).expect(200);
      expect(res.body).toEqual({ membership: null });
      await user.delete(`/api/parishes/${parishId}/follow`).expect(404);
    });

    it('un paroissien redevient fidèle (sans responsabilité), puis peut quitter', async () => {
      const user = await registerAgent(app, 'mem-stepdown@test.fr');
      const id = await idOf(user);
      await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      await admin
        .patch(`/api/parishes/${parishId}/members/${id}`)
        .send({ status: 'PARISHIONER', duties: ['READER'] })
        .expect(200);
      await user.get(`/api/parishes/${parishId}/celebrations`).expect(200);

      const res = await user.delete(`/api/parishes/${parishId}/follow`).expect(200);
      expect(res.body.membership).toEqual({ status: 'FAITHFUL', duties: [] });
      await user.get(`/api/parishes/${parishId}/celebrations`).expect(403);
      await user.delete(`/api/parishes/${parishId}/follow`).expect(200);
    });
  });

  describe('gestion par l’administrateur', () => {
    it('liste sans email ni téléphone, avec nom, prénom, date et statut', async () => {
      const user = await registerAgent(app, 'mem-listed@test.fr');
      await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      const res = await members(admin, '?q=dupont').expect(200);
      expect(res.body.total).toBeGreaterThan(0);
      const row = res.body.items.find((m: { userId: string }) => m.userId !== undefined);
      expect(Object.keys(row).sort()).toEqual(
        ['duties', 'firstName', 'joinedAt', 'lastName', 'status', 'userId'].sort(),
      );
      expect(JSON.stringify(res.body)).not.toMatch(/@|phone|email/i);
    });

    it('filtre par statut et par nom', async () => {
      const user = await registerAgent(app, 'mem-filter@test.fr');
      await prisma.user.update({
        where: { email: 'mem-filter@test.fr' },
        data: { firstName: 'Zacharie', lastName: 'Ngono' },
      });
      await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      const byName = await members(admin, '?q=zach%20ngo').expect(200);
      expect(byName.body.items).toHaveLength(1);
      expect(byName.body.items[0]).toMatchObject({ firstName: 'Zacharie', status: 'FAITHFUL' });
      const admins = await members(admin, '?status=PARISH_ADMIN').expect(200);
      expect(admins.body.items.every((m: { status: string }) => m.status === 'PARISH_ADMIN')).toBe(
        true,
      );
      await members(admin, '?status=ROOT').expect(400);
    });

    it('promeut un fidèle en paroissien immédiatement, sans invitation', async () => {
      const user = await registerAgent(app, 'mem-promote@test.fr');
      const id = await idOf(user);
      await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      const res = await admin
        .patch(`/api/parishes/${parishId}/members/${id}`)
        .send({ status: 'PARISHIONER' })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'PARISHIONER', duties: [] });
      expect((await user.get(`/api/parishes/${parishId}/membership`).expect(200)).body.status).toBe(
        'PARISHIONER',
      );
    });

    it('attribue des responsabilités cumulables, seulement à un paroissien', async () => {
      const user = await registerAgent(app, 'mem-duties@test.fr');
      const id = await idOf(user);
      await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      await admin
        .patch(`/api/parishes/${parishId}/members/${id}`)
        .send({ duties: ['READER'] })
        .expect(400);
      const res = await admin
        .patch(`/api/parishes/${parishId}/members/${id}`)
        .send({ status: 'PARISHIONER', duties: ['READER', 'ANNOUNCER', 'READER'] })
        .expect(200);
      expect(res.body.duties.sort()).toEqual(['ANNOUNCER', 'READER']);
      await user.get(`/api/parishes/${parishId}/celebrations`).expect(200);
      await user
        .post(`/api/parishes/${parishId}/announcements`)
        .send({ title: 'x', body: 'y' })
        .expect(201);
      await user
        .post(`/api/parishes/${parishId}/templates`)
        .send({ name: 'n', type: 'WEDDING' })
        .expect(403);
      // Rétrograder en fidèle efface les responsabilités.
      const down = await admin
        .patch(`/api/parishes/${parishId}/members/${id}`)
        .send({ status: 'FAITHFUL' })
        .expect(200);
      expect(down.body.duties).toEqual([]);
      await user
        .post(`/api/parishes/${parishId}/announcements`)
        .send({ title: 'x', body: 'y' })
        .expect(403);
    });

    it('valide le corps de la requête', async () => {
      const id = await idOf(admin);
      await admin.patch(`/api/parishes/${parishId}/members/${id}`).send({}).expect(400);
      await admin
        .patch(`/api/parishes/${parishId}/members/${id}`)
        .send({ status: 'KING' })
        .expect(400);
      await admin
        .patch(`/api/parishes/${parishId}/members/${id}`)
        .send({ duties: ['BOSS'] })
        .expect(400);
      await admin
        .patch(`/api/parishes/${parishId}/members/inconnu`)
        .send({ status: 'FAITHFUL' })
        .expect(404);
    });

    it('retire un membre sans blocage', async () => {
      const user = await registerAgent(app, 'mem-removed@test.fr');
      const id = await idOf(user);
      await user.post(`/api/parishes/${parishId}/follow`).expect(201);
      await admin.delete(`/api/parishes/${parishId}/members/${id}`).expect(200);
      await admin.delete(`/api/parishes/${parishId}/members/${id}`).expect(404);
      expect(
        (await user.get(`/api/parishes/${parishId}/membership`).expect(200)).body.status,
      ).toBeNull();
    });

    it('une paroisse garde toujours un administrateur', async () => {
      const ownerAgent = await registerAgent(app, 'mem-solo@test.fr');
      const solo = (
        await ownerAgent
          .post('/api/parishes')
          .send({ name: 'Paroisse Solo', city: 'Douala', country: 'Cameroun' })
          .expect(201)
      ).body.id as string;
      const ownerId = await idOf(ownerAgent);
      const rejected = async (res: request.Test) => {
        const r = await res.expect(409);
        expect(r.body.message.message ?? r.body.message).toBe('parishLastAdmin');
      };
      await rejected(
        ownerAgent
          .patch(`/api/parishes/${solo}/members/${ownerId}`)
          .send({ status: 'PARISHIONER' }),
      );
      await rejected(ownerAgent.delete(`/api/parishes/${solo}/members/${ownerId}`));
      await rejected(ownerAgent.delete(`/api/parishes/${solo}/follow`));

      // Avec un second administrateur, le premier peut partir ; le second devient alors le dernier.
      const second = await registerAgent(app, 'mem-solo2@test.fr');
      const secondId = await idOf(second);
      await second.post(`/api/parishes/${solo}/follow`).expect(201);
      await ownerAgent
        .patch(`/api/parishes/${solo}/members/${secondId}`)
        .send({ status: 'PARISH_ADMIN' })
        .expect(200);
      await ownerAgent.delete(`/api/parishes/${solo}/follow`).expect(200);
      await rejected(second.delete(`/api/parishes/${solo}/members/${secondId}`));
    });

    it('isole les paroisses : l’admin d’une paroisse ne gère pas les membres d’une autre', async () => {
      const otherOwner = await registerAgent(app, 'mem-other@test.fr');
      const other = (
        await otherOwner
          .post('/api/parishes')
          .send({ name: 'Paroisse Autre', city: 'Douala', country: 'Cameroun' })
          .expect(201)
      ).body.id as string;
      const otherId = await idOf(otherOwner);
      await admin.get(`/api/parishes/${other}/members`).expect(403);
      await admin
        .patch(`/api/parishes/${other}/members/${otherId}`)
        .send({ status: 'FAITHFUL' })
        .expect(403);
      // Passer par sa propre paroisse avec l'identifiant d'un membre de l'autre : introuvable.
      await admin
        .patch(`/api/parishes/${parishId}/members/${otherId}`)
        .send({ status: 'FAITHFUL' })
        .expect(404);
      await admin.delete(`/api/parishes/${parishId}/members/${otherId}`).expect(404);
    });

    it('l’ancienne invitation par email n’existe plus', async () => {
      await admin
        .post(`/api/parishes/${parishId}/members`)
        .send({ email: 'mem-follow@test.fr', role: 'VIEWER' })
        .expect(404);
    });

    it('un ADMIN de plateforme lit la liste (lecture seule), sans pouvoir modifier', async () => {
      const staff = await registerAgent(app, 'mem-staff@test.fr');
      await prisma.user.update({ where: { email: 'mem-staff@test.fr' }, data: { role: 'ADMIN' } });
      await members(staff).expect(200);
      await staff
        .patch(`/api/parishes/${parishId}/members/${await idOf(admin)}`)
        .send({ status: 'FAITHFUL' })
        .expect(403);
      await newAgent(app).get(`/api/parishes/${parishId}/members`).expect(401);
    });
  });
});
