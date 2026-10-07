import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { Agent, PASSWORD, createTestApp, newAgent, registerAgent } from './helpers';

/** Rôles de plateforme : hiérarchie, suspension, lecture seule des paroisses, audit. */
describe('Plateforme : rôles et suspension', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  const idOf = async (email: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
  const withRole = async (email: string, role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR') => {
    const agent = await registerAgent(app, email);
    await prisma.user.update({ where: { email }, data: { role } });
    return agent;
  };
  const roleOf = async (email: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { email } })).role;

  let sa: Agent;
  let admin: Agent;
  let moderator: Agent;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    // Les autres fichiers de test laissent des SUPER_ADMIN : on repart d'un seul, connu.
    await prisma.user.updateMany({ where: { role: 'SUPER_ADMIN' }, data: { role: 'USER' } });
    sa = await withRole('plat-sa@test.fr', 'SUPER_ADMIN');
    admin = await withRole('plat-admin@test.fr', 'ADMIN');
    moderator = await withRole('plat-mod@test.fr', 'MODERATOR');
  });

  afterAll(() => app.close());

  describe('accès à la plateforme', () => {
    it('visiteur : 401 ; utilisateur ordinaire et modérateur : 403 sur la liste des comptes', async () => {
      await http().get('/api/platform/users').expect(401);
      const user = await registerAgent(app, 'plat-simple@test.fr');
      await user.get('/api/platform/users').expect(403);
      await moderator
        .get('/api/platform/users')
        .expect(403)
        .expect((res) => expect(res.body.message.message).toBe('forbiddenPlatform'));
    });

    it('ADMIN et SUPER_ADMIN listent les comptes (recherche, pagination, aucun secret)', async () => {
      for (const agent of [admin, sa]) await agent.get('/api/platform/users').expect(200);
      const res = await admin.get('/api/platform/users?q=PLAT-MOD').expect(200);
      expect(res.body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
      expect(res.body.items[0]).toMatchObject({ email: 'plat-mod@test.fr', role: 'MODERATOR' });
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
      await admin.get('/api/platform/users?page=0').expect(400);
    });

    it('/auth/me expose le rôle de plateforme', async () => {
      const res = await moderator.get('/api/auth/me').expect(200);
      expect(res.body.role).toBe('MODERATOR');
    });
  });

  describe('changement de rôle', () => {
    it('le SUPER_ADMIN nomme un ADMIN : ses sessions sont coupées, il se reconnecte avec le nouveau rôle', async () => {
      const target = await registerAgent(app, 'plat-promu@test.fr');
      const id = await idOf('plat-promu@test.fr');
      await target.get('/api/auth/me').expect(200);

      const res = await sa
        .patch(`/api/platform/users/${id}/role`)
        .send({ role: 'ADMIN' })
        .expect(200);
      expect(res.body).toMatchObject({ id, role: 'ADMIN' });

      // Le refresh token de l'ancienne session est révoqué.
      await target.post('/api/auth/refresh').expect(401);
      const login = await newAgent(app)
        .post('/api/auth/login')
        .send({ email: 'plat-promu@test.fr', password: PASSWORD })
        .expect(201);
      expect(login.body.user.role).toBe('ADMIN');

      const audit = await prisma.authAuditLog.findFirst({
        where: { event: 'PLATFORM_ROLE_CHANGED', userId: id },
      });
      expect(audit).toMatchObject({ actorId: await idOf('plat-sa@test.fr'), detail: 'USER>ADMIN' });
    });

    it('l’ADMIN nomme et révoque des modérateurs', async () => {
      await registerAgent(app, 'plat-futur-mod@test.fr');
      const id = await idOf('plat-futur-mod@test.fr');
      await admin.patch(`/api/platform/users/${id}/role`).send({ role: 'MODERATOR' }).expect(200);
      expect(await roleOf('plat-futur-mod@test.fr')).toBe('MODERATOR');
      await admin.patch(`/api/platform/users/${id}/role`).send({ role: 'USER' }).expect(200);
      expect(await roleOf('plat-futur-mod@test.fr')).toBe('USER');
    });

    it('l’ADMIN ne peut ni créer d’ADMIN, ni toucher à un ADMIN ou au SUPER_ADMIN', async () => {
      await registerAgent(app, 'plat-cible@test.fr');
      const target = await idOf('plat-cible@test.fr');
      await admin
        .patch(`/api/platform/users/${target}/role`)
        .send({ role: 'ADMIN' })
        .expect(403)
        .expect((res) => expect(res.body.message.message).toBe('platformRoleForbidden'));
      await admin
        .patch(`/api/platform/users/${await idOf('plat-sa@test.fr')}/role`)
        .send({ role: 'USER' })
        .expect(403);
      await withRole('plat-admin2@test.fr', 'ADMIN');
      await admin
        .patch(`/api/platform/users/${await idOf('plat-admin2@test.fr')}/role`)
        .send({ role: 'USER' })
        .expect(403);
      expect(await roleOf('plat-sa@test.fr')).toBe('SUPER_ADMIN');
      expect(await roleOf('plat-admin2@test.fr')).toBe('ADMIN');
    });

    it('le modérateur ne change aucun rôle ; un rôle inconnu est refusé (400)', async () => {
      const target = await idOf('plat-cible@test.fr');
      await moderator
        .patch(`/api/platform/users/${target}/role`)
        .send({ role: 'MODERATOR' })
        .expect(403);
      await sa.patch(`/api/platform/users/${target}/role`).send({ role: 'ROOT' }).expect(400);
      await sa.patch('/api/platform/users/inconnu/role').send({ role: 'USER' }).expect(404);
    });

    it('le dernier SUPER_ADMIN ne peut pas être retiré, même par lui-même', async () => {
      await sa
        .patch(`/api/platform/users/${await idOf('plat-sa@test.fr')}/role`)
        .send({ role: 'ADMIN' })
        .expect(409)
        .expect((res) => expect(res.body.message.message).toBe('platformLastSuperAdmin'));
      expect(await roleOf('plat-sa@test.fr')).toBe('SUPER_ADMIN');
    });

    it('avec un second SUPER_ADMIN, on peut en rétrograder un', async () => {
      await withRole('plat-sa2@test.fr', 'SUPER_ADMIN');
      const id = await idOf('plat-sa2@test.fr');
      await sa.patch(`/api/platform/users/${id}/role`).send({ role: 'ADMIN' }).expect(200);
      expect(await roleOf('plat-sa2@test.fr')).toBe('ADMIN');
    });
  });

  describe('suspension', () => {
    it('suspend un compte : session coupée, connexion refusée ; rétablissement : il se reconnecte', async () => {
      const target = await registerAgent(app, 'plat-suspendu@test.fr');
      const id = await idOf('plat-suspendu@test.fr');
      await target.get('/api/auth/me').expect(200);

      const res = await admin.post(`/api/platform/users/${id}/suspend`).expect(200);
      expect(res.body.suspendedAt).toEqual(expect.any(String));

      // Même avec le jeton d'accès encore valide, le compte est refusé tout de suite.
      await target.get('/api/auth/me').expect(401);
      await target.post('/api/auth/refresh').expect(401);
      await newAgent(app)
        .post('/api/auth/login')
        .send({ email: 'plat-suspendu@test.fr', password: PASSWORD })
        .expect(403)
        .expect((r) => expect(r.body.message.message).toBe('accountSuspended'));

      await admin.post(`/api/platform/users/${id}/reinstate`).expect(200);
      await newAgent(app)
        .post('/api/auth/login')
        .send({ email: 'plat-suspendu@test.fr', password: PASSWORD })
        .expect(201);

      const events = await prisma.authAuditLog.findMany({
        where: { userId: id, event: { in: ['ACCOUNT_SUSPENDED', 'ACCOUNT_REINSTATED'] } },
        orderBy: { createdAt: 'asc' },
      });
      expect(events.map((e) => e.event)).toEqual(['ACCOUNT_SUSPENDED', 'ACCOUNT_REINSTATED']);
      expect(events[0].actorId).toBe(await idOf('plat-admin@test.fr'));
    });

    it('un administrateur suspendu perd aussitôt l’accès à la plateforme', async () => {
      const victim = await withRole('plat-admin-suspendu@test.fr', 'ADMIN');
      await victim.get('/api/platform/users').expect(200);
      await sa
        .post(`/api/platform/users/${await idOf('plat-admin-suspendu@test.fr')}/suspend`)
        .expect(200);
      await victim.get('/api/platform/users').expect(401);
    });

    it('règles : l’ADMIN ne suspend ni ADMIN ni SUPER_ADMIN, personne ne se suspend, le modérateur ne suspend pas', async () => {
      const saId = await idOf('plat-sa@test.fr');
      const adminId = await idOf('plat-admin@test.fr');
      const simpleId = await idOf('plat-cible@test.fr');
      await admin.post(`/api/platform/users/${saId}/suspend`).expect(403);
      await admin.post(`/api/platform/users/${adminId}/suspend`).expect(403);
      await sa.post(`/api/platform/users/${saId}/suspend`).expect(403);
      await moderator.post(`/api/platform/users/${simpleId}/suspend`).expect(403);
      await admin.post('/api/platform/users/inconnu/suspend').expect(404);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: saId } })).suspendedAt).toBeNull();
    });
  });

  describe('lecture seule des paroisses', () => {
    it('ADMIN et MODERATOR de plateforme lisent les données internes mais n’écrivent jamais', async () => {
      const owner = await registerAgent(app, 'plat-paroisse-owner@test.fr');
      const parish = await owner
        .post('/api/parishes')
        .send({ name: 'Paroisse Plateforme', city: 'Douala', country: 'Cameroun' })
        .expect(201);
      const id = parish.body.id;

      for (const agent of [admin, moderator]) {
        await agent.get(`/api/parishes/${id}/celebrations`).expect(200);
        await agent.patch(`/api/parishes/${id}`).send({ name: 'Piratée' }).expect(403);
        await agent
          .post(`/api/parishes/${id}/celebrations`)
          .send({ title: 'x', type: 'MASS' })
          .expect(403);
      }
      const visitor = await registerAgent(app, 'plat-curieux@test.fr');
      await visitor.get(`/api/parishes/${id}/celebrations`).expect(403);
      expect((await prisma.parish.findUniqueOrThrow({ where: { id } })).name).toBe(
        'Paroisse Plateforme',
      );
    });
  });
});
