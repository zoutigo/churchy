import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { NotificationJob } from '@churchy/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashToken } from '../src/modules/auth/token.util';
import {
  PASSWORD,
  cookieValue,
  createTestApp,
  findJobFor,
  newAgent,
  openNotificationsQueue,
  registerAgent,
  setCookieHeaders,
  tokenFromUrl,
} from './helpers';

describe('Authentification (cookies httpOnly, refresh, reset, vérification)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let queue: Queue;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    queue = openNotificationsQueue();
    await queue.obliterate({ force: true });
  });

  afterAll(async () => {
    await queue.obliterate({ force: true });
    await queue.close();
    await app.close();
  });

  describe('inscription et connexion', () => {
    it('inscrit, pose des cookies httpOnly et ne renvoie AUCUN jeton dans le corps', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ email: 'cookies@test.fr', password: PASSWORD, firstName: 'A', lastName: 'B' })
        .expect(201);

      expect(res.body.user).toMatchObject({ email: 'cookies@test.fr', emailVerified: false });
      expect(JSON.stringify(res.body)).not.toMatch(/token|passwordHash/i);

      const cookies = setCookieHeaders(res);
      expect(cookies).toHaveLength(3);
      for (const c of cookies) expect(c).toMatch(/SameSite=Lax/i);
      // Jetons : httpOnly. Indicateur de session (valeur « 1 », sans secret) : lisible par le site web.
      for (const name of ['churchy_at', 'churchy_rt']) {
        expect(cookies.find((c) => c.startsWith(`${name}=`))).toMatch(/HttpOnly/i);
      }
      const flag = cookies.find((c) => c.startsWith('churchy_session='));
      expect(flag).not.toMatch(/HttpOnly/i);
      expect(flag).toMatch(/^churchy_session=1;/);
      expect(cookies.find((c) => c.startsWith('churchy_rt='))).toMatch(/Path=\/api\/auth/);
      expect(cookies.find((c) => c.startsWith('churchy_at='))).toMatch(/Path=\/;/);
    });

    it('refuse un doublon (même en changeant la casse) et une entrée invalide', async () => {
      const body = { email: 'dup@test.fr', password: PASSWORD, firstName: 'A', lastName: 'B' };
      await http().post('/api/auth/register').send(body).expect(201);
      await http().post('/api/auth/register').send(body).expect(409);
      await http()
        .post('/api/auth/register')
        .send({ ...body, email: 'DUP@Test.FR' })
        .expect(409);
      await http().post('/api/auth/register').send({ email: 'nope' }).expect(400);
    });

    it('connecte, insensible à la casse de l’email, et refuse un mauvais mot de passe', async () => {
      await registerAgent(app, 'login@test.fr');
      const ok = await http()
        .post('/api/auth/login')
        .send({ email: 'LOGIN@test.fr', password: PASSWORD })
        .expect(201);
      expect(cookieValue(ok, 'churchy_at')).toBeTruthy();

      const ko = await http()
        .post('/api/auth/login')
        .send({ email: 'login@test.fr', password: 'faux-faux-faux' })
        .expect(401);
      expect(setCookieHeaders(ko)).toHaveLength(0);
      expect(ko.body.message.message).toBe('Identifiants invalides');
    });

    it('protège /auth/me : 401 sans cookie, profil avec cookie', async () => {
      const agent = await registerAgent(app, 'me@test.fr');
      await http().get('/api/auth/me').expect(401);
      const res = await agent.get('/api/auth/me').expect(200);
      expect(res.body).toMatchObject({ email: 'me@test.fr', role: 'USER', emailVerified: false });
      expect(res.body.passwordHash).toBeUndefined();
    });

    describe('langue du compte', () => {
      it('est le français par défaut et suit la langue choisie à l’inscription', async () => {
        const fr = await http()
          .post('/api/auth/register')
          .send({ email: 'lang-fr@test.fr', password: PASSWORD, firstName: 'A', lastName: 'B' })
          .expect(201);
        expect(fr.body.user.locale).toBe('fr');

        const en = await http()
          .post('/api/auth/register')
          .send({
            email: 'lang-en@test.fr',
            password: PASSWORD,
            firstName: 'A',
            lastName: 'B',
            locale: 'en',
          })
          .expect(201);
        expect(en.body.user.locale).toBe('en');
      });

      it('est modifiable et persistée : /auth/me et une nouvelle connexion la renvoient', async () => {
        const agent = await registerAgent(app, 'lang-change@test.fr');
        const res = await agent.patch('/api/auth/me/locale').send({ locale: 'en' }).expect(200);
        expect(res.body.locale).toBe('en');
        expect((await agent.get('/api/auth/me')).body.locale).toBe('en');

        const login = await http()
          .post('/api/auth/login')
          .send({ email: 'lang-change@test.fr', password: PASSWORD })
          .expect(201);
        expect(login.body.user.locale).toBe('en');
      });

      it('refuse une langue inconnue (400) et un appel sans session (401)', async () => {
        const agent = await registerAgent(app, 'lang-bad@test.fr');
        await agent.patch('/api/auth/me/locale').send({ locale: 'de' }).expect(400);
        await http().patch('/api/auth/me/locale').send({ locale: 'en' }).expect(401);
        expect((await agent.get('/api/auth/me')).body.locale).toBe('fr');
      });
    });

    it('accepte aussi un jeton Bearer pour les clients non navigateur', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ email: 'bearer@test.fr', password: PASSWORD, firstName: 'A', lastName: 'B' });
      const access = cookieValue(res, 'churchy_at');
      await http().get('/api/auth/me').set('Authorization', `Bearer ${access}`).expect(200);
    });
  });

  describe('refresh et déconnexion', () => {
    it('renouvelle la session et fait tourner le refresh token', async () => {
      const first = await http()
        .post('/api/auth/register')
        .send({ email: 'refresh@test.fr', password: PASSWORD, firstName: 'A', lastName: 'B' });
      const oldRefresh = cookieValue(first, 'churchy_rt') as string;

      const res = await http()
        .post('/api/auth/refresh')
        .set('Cookie', `churchy_rt=${oldRefresh}`)
        .expect(200);
      const newRefresh = cookieValue(res, 'churchy_rt') as string;

      expect(res.body.user.email).toBe('refresh@test.fr');
      expect(newRefresh).toBeTruthy();
      expect(newRefresh).not.toBe(oldRefresh);
      expect(cookieValue(res, 'churchy_at')).toBeTruthy();

      // L'ancien jeton est révoqué, le nouveau fonctionne.
      await http().post('/api/auth/refresh').set('Cookie', `churchy_rt=${oldRefresh}`).expect(401);
      await http().post('/api/auth/refresh').set('Cookie', `churchy_rt=${newRefresh}`).expect(200);
    });

    it('révoque toute la session si un ancien refresh token est rejoué (vol probable)', async () => {
      const first = await http()
        .post('/api/auth/register')
        .send({ email: 'theft@test.fr', password: PASSWORD, firstName: 'A', lastName: 'B' });
      const stolen = cookieValue(first, 'churchy_rt') as string;
      const rotated = await http()
        .post('/api/auth/refresh')
        .set('Cookie', `churchy_rt=${stolen}`)
        .expect(200);
      const legit = cookieValue(rotated, 'churchy_rt') as string;

      // On vieillit la révocation pour sortir du délai de tolérance des courses entre onglets.
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(stolen) },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });

      await http().post('/api/auth/refresh').set('Cookie', `churchy_rt=${stolen}`).expect(401);
      // Le jeton légitime, pourtant jamais utilisé, est lui aussi révoqué.
      await http().post('/api/auth/refresh').set('Cookie', `churchy_rt=${legit}`).expect(401);
    });

    it('refuse un refresh sans cookie ou avec un jeton inventé, et nettoie les cookies', async () => {
      await http().post('/api/auth/refresh').expect(401);
      const res = await http()
        .post('/api/auth/refresh')
        .set('Cookie', 'churchy_rt=inventé')
        .expect(401);
      expect(setCookieHeaders(res).every((c) => /Expires=Thu, 01 Jan 1970/i.test(c))).toBe(true);
    });

    it('déconnecte côté serveur : le refresh token ne fonctionne plus après logout', async () => {
      const agent = await registerAgent(app, 'logout@test.fr');
      await agent.get('/api/auth/me').expect(200);

      const res = await agent.post('/api/auth/logout').expect(200);
      expect(setCookieHeaders(res).every((c) => /Expires=Thu, 01 Jan 1970/i.test(c))).toBe(true);
      await agent.get('/api/auth/me').expect(401);

      // Même en rejouant l'ancien cookie de refresh : la session est révoquée en base.
      const fresh = await http()
        .post('/api/auth/login')
        .send({ email: 'logout@test.fr', password: PASSWORD });
      const refresh = cookieValue(fresh, 'churchy_rt') as string;
      await http().post('/api/auth/logout').set('Cookie', `churchy_rt=${refresh}`).expect(200);
      await http().post('/api/auth/refresh').set('Cookie', `churchy_rt=${refresh}`).expect(401);
    });

    it('logout est sans danger sans session', async () => {
      await http().post('/api/auth/logout').expect(200);
    });
  });

  describe('vérification d’email', () => {
    it('envoie un lien à l’inscription, le vérifie une seule fois', async () => {
      const agent = await registerAgent(app, 'verify@test.fr');
      const job = await findJobFor(
        queue,
        NotificationJob.EMAIL_VERIFICATION_REQUESTED,
        'verify@test.fr',
      );
      expect(job).toBeDefined();
      expect(job.data.url).toContain('/verify-email?token=');
      const token = tokenFromUrl(job.data.url);

      await http().post('/api/auth/verify-email').send({ token: 'inventé' }).expect(400);
      await http().post('/api/auth/verify-email').send({ token }).expect(200);
      expect((await agent.get('/api/auth/me')).body.emailVerified).toBe(true);
      // À usage unique.
      await http().post('/api/auth/verify-email').send({ token }).expect(400);
    });

    it('renvoie un nouveau lien (l’ancien est invalidé) puis plus rien une fois vérifié', async () => {
      const agent = await registerAgent(app, 'resend@test.fr');
      await http().post('/api/auth/resend-verification').expect(401);

      const oldToken = tokenFromUrl(
        (await findJobFor(queue, NotificationJob.EMAIL_VERIFICATION_REQUESTED, 'resend@test.fr'))
          .data.url,
      );
      await agent.post('/api/auth/resend-verification').expect(200);
      const jobs = (await queue.getJobs(['waiting'])).filter(
        (j) =>
          j.name === NotificationJob.EMAIL_VERIFICATION_REQUESTED &&
          j.data.email === 'resend@test.fr',
      );
      expect(jobs).toHaveLength(2);

      await http().post('/api/auth/verify-email').send({ token: oldToken }).expect(400);
      const newest = jobs.sort((a, b) => b.timestamp - a.timestamp)[0];
      await http()
        .post('/api/auth/verify-email')
        .send({ token: tokenFromUrl(newest.data.url) })
        .expect(200);

      await agent.post('/api/auth/resend-verification').expect(200);
      const after = (await queue.getJobs(['waiting'])).filter(
        (j) =>
          j.name === NotificationJob.EMAIL_VERIFICATION_REQUESTED &&
          j.data.email === 'resend@test.fr',
      );
      expect(after).toHaveLength(2);
    });
  });

  describe('mot de passe oublié', () => {
    it('répond pareil pour un email inconnu et n’enfile rien', async () => {
      const known = await registerAgent(app, 'known@test.fr');
      void known;
      const a = await http()
        .post('/api/auth/forgot-password')
        .send({ email: 'known@test.fr' })
        .expect(200);
      const b = await http()
        .post('/api/auth/forgot-password')
        .send({ email: 'personne@test.fr' })
        .expect(200);
      expect(b.body).toEqual(a.body);
      expect(
        await findJobFor(queue, NotificationJob.PASSWORD_RESET_REQUESTED, 'personne@test.fr'),
      ).toBeUndefined();
    });

    it('réinitialise le mot de passe via le lien, déconnecte toutes les sessions, lien à usage unique', async () => {
      const agent = await registerAgent(app, 'reset@test.fr');
      await agent.get('/api/auth/me').expect(200);

      await http().post('/api/auth/forgot-password').send({ email: 'reset@test.fr' }).expect(200);
      const job = await findJobFor(
        queue,
        NotificationJob.PASSWORD_RESET_REQUESTED,
        'reset@test.fr',
      );
      expect(job.data.url).toContain('/reset-password?token=');
      const token = tokenFromUrl(job.data.url);

      await http().post('/api/auth/reset-password').send({ token, password: 'court' }).expect(400);
      await http()
        .post('/api/auth/reset-password')
        .send({ token: 'inventé', password: 'nouveaumdp1' })
        .expect(400);
      await http()
        .post('/api/auth/reset-password')
        .send({ token, password: 'nouveaumdp1' })
        .expect(200);
      await http()
        .post('/api/auth/reset-password')
        .send({ token, password: 'encoreunautre1' })
        .expect(400);

      // Toutes les sessions ouvertes sont révoquées : le refresh de l'ancienne session échoue.
      await agent.post('/api/auth/refresh').expect(401);

      await http()
        .post('/api/auth/login')
        .send({ email: 'reset@test.fr', password: PASSWORD })
        .expect(401);
      await http()
        .post('/api/auth/login')
        .send({ email: 'reset@test.fr', password: 'nouveaumdp1' })
        .expect(201);
    });

    it('un lien de réinitialisation ne peut pas servir à vérifier un email (et inversement)', async () => {
      await registerAgent(app, 'mixed@test.fr');
      await http().post('/api/auth/forgot-password').send({ email: 'mixed@test.fr' });
      const reset = tokenFromUrl(
        (await findJobFor(queue, NotificationJob.PASSWORD_RESET_REQUESTED, 'mixed@test.fr')).data
          .url,
      );
      await http().post('/api/auth/verify-email').send({ token: reset }).expect(400);
    });

    it('un lien expiré est refusé', async () => {
      await registerAgent(app, 'expired@test.fr');
      await http().post('/api/auth/forgot-password').send({ email: 'expired@test.fr' });
      const token = tokenFromUrl(
        (await findJobFor(queue, NotificationJob.PASSWORD_RESET_REQUESTED, 'expired@test.fr')).data
          .url,
      );
      await prisma.authToken.updateMany({
        where: { tokenHash: hashToken(token) },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await http()
        .post('/api/auth/reset-password')
        .send({ token, password: 'nouveaumdp1' })
        .expect(400);
    });

    it('ne stocke que le hash des jetons en base', async () => {
      await registerAgent(app, 'hashed@test.fr');
      const token = tokenFromUrl(
        (await findJobFor(queue, NotificationJob.EMAIL_VERIFICATION_REQUESTED, 'hashed@test.fr'))
          .data.url,
      );
      expect(await prisma.authToken.count({ where: { tokenHash: token } })).toBe(0);
      expect(await prisma.authToken.count({ where: { tokenHash: hashToken(token) } })).toBe(1);
    });
  });

  it('newAgent conserve bien les cookies entre les requêtes (sanity check du harnais)', async () => {
    const agent = newAgent(app);
    await agent
      .post('/api/auth/register')
      .send({ email: 'sanity@test.fr', password: PASSWORD, firstName: 'A', lastName: 'B' })
      .expect(201);
    await agent.get('/api/auth/me').expect(200);
  });
});
