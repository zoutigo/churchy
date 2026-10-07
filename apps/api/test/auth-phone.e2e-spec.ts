import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Queue } from 'bullmq';
import request from 'supertest';
import { NotificationJob } from '@churchy/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  PASSWORD,
  cookieValue,
  createTestApp,
  findJobFor,
  newAgent,
  openNotificationsQueue,
  registerAgent,
  registerPhoneAgent,
  setCookieHeaders,
  tokenFromUrl,
} from './helpers';

const PIN = '482915';
let counter = 0;
/** Numéro camerounais unique par test (9 chiffres, commence par 6). */
const nextPhone = () =>
  `+2376${String(70000000 + ++counter * 7919 + (Date.now() % 1000)).slice(0, 8)}`;

describe('Connexion par téléphone + PIN', () => {
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

  describe('inscription', () => {
    it('crée un compte sans email ni mot de passe, pose les cookies, aucun jeton dans le corps', async () => {
      const phone = nextPhone();
      const res = await http()
        .post('/api/auth/register/phone')
        .send({ phone, pin: PIN, firstName: 'Marie', lastName: 'Ngono', locale: 'en' })
        .expect(201);

      expect(res.body.user).toMatchObject({
        email: null,
        phone,
        firstName: 'Marie',
        emailVerified: false,
        locale: 'en',
        methods: { password: false, pin: true, google: false },
      });
      expect(JSON.stringify(res.body)).not.toMatch(/token|hash/i);
      expect(setCookieHeaders(res)).toHaveLength(3);
      expect(cookieValue(res, 'churchy_at')).toBeTruthy();
    });

    it('stocke le PIN haché et le numéro non vérifié', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      const credential = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      expect(credential.pinHash).toMatch(/^p1\$\$2[aby]\$/); // poivré (PIN_PEPPER)
      expect(credential.pinHash).not.toContain(PIN);
      expect(credential.verifiedAt).toBeNull();
    });

    it('accepte un numéro saisi avec espaces et le range en E.164', async () => {
      const phone = nextPhone();
      const spaced = `${phone.slice(0, 4)} ${phone.slice(4, 5)} ${phone.slice(5, 7)} ${phone.slice(7, 9)} ${phone.slice(9, 11)} ${phone.slice(11)}`;
      const res = await http()
        .post('/api/auth/register/phone')
        .send({ phone: spaced, pin: PIN, firstName: 'A', lastName: 'B' })
        .expect(201);
      expect(res.body.user.phone).toBe(phone);
    });

    it('refuse un numéro déjà inscrit, quelle que soit la façon de l’écrire', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      await http()
        .post('/api/auth/register/phone')
        .send({ phone: phone.replace('+', '00'), pin: '739104', firstName: 'X', lastName: 'Y' })
        .expect(409)
        .expect((res) => expect(res.body.message.message).toBe('phoneAlreadyUsed'));
    });

    it('deux inscriptions simultanées avec le même numéro : une seule réussit', async () => {
      const phone = nextPhone();
      const send = () =>
        http()
          .post('/api/auth/register/phone')
          .send({ phone, pin: PIN, firstName: 'A', lastName: 'B' });
      const statuses = (await Promise.all([send(), send()])).map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409]);
      expect(await prisma.userPhoneCredential.count({ where: { phoneE164: phone } })).toBe(1);
    });

    it.each([
      ['PIN trop court', { pin: '4829' }, 'pin', 'pinInvalid'],
      ['PIN avec lettres', { pin: '48a915' }, 'pin', 'pinInvalid'],
      ['PIN trop simple', { pin: '123456' }, 'pin', 'pinTooWeak'],
      ['PIN répété', { pin: '555555' }, 'pin', 'pinTooWeak'],
      ['numéro sans indicatif', { phone: '677123456' }, 'phone', 'phoneInvalid'],
      ['numéro incomplet', { phone: '+2376771' }, 'phone', 'phoneInvalid'],
      ['prénom vide', { firstName: '' }, 'firstName', 'firstNameRequired'],
    ])('refuse : %s (erreur sous le bon champ)', async (_label, override, field, code) => {
      const res = await http()
        .post('/api/auth/register/phone')
        .send({ phone: nextPhone(), pin: PIN, firstName: 'A', lastName: 'B', ...override })
        .expect(400);
      expect(res.body.message.fieldErrors[field]).toContain(code);
    });
  });

  describe('connexion', () => {
    it('un PIN enregistré avant le poivre reste valable et est repoté à la connexion', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      const legacy = await bcrypt.hash(PIN, 4);
      await prisma.userPhoneCredential.update({
        where: { phoneE164: phone },
        data: { pinHash: legacy },
      });

      await http().post('/api/auth/login/phone').send({ phone, pin: '000001' }).expect(401);
      const wrong = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      expect(wrong.pinHash).toBe(legacy); // un échec ne change rien

      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(201);
      const upgraded = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      expect(upgraded.pinHash).toMatch(/^p1\$/);
      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(201);
    });

    it('ouvre une session avec le bon PIN, même numéro non vérifié', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      const agent = newAgent(app);
      const res = await agent.post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(201);
      expect(res.body.user.phone).toBe(phone);
      expect(cookieValue(res, 'churchy_rt')).toBeTruthy();
      const me = await agent.get('/api/auth/me').expect(200);
      expect(me.body).toMatchObject({ phone, email: null, methods: { pin: true } });
    });

    it('accepte le numéro écrit autrement (espaces, 00)', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      await http()
        .post('/api/auth/login/phone')
        .send({ phone: phone.replace('+', '00'), pin: PIN })
        .expect(201);
    });

    it('mauvais PIN et numéro inconnu : même réponse 401', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      const wrong = await http().post('/api/auth/login/phone').send({ phone, pin: '000001' });
      const unknown = await http()
        .post('/api/auth/login/phone')
        .send({ phone: nextPhone(), pin: PIN });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.message).toEqual(unknown.body.message);
      expect(wrong.body.message.message).toBe('invalidCredentials');
    });

    it('un compte par téléphone ne peut pas se connecter par email + mot de passe', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      await http()
        .post('/api/auth/login')
        .send({ email: 'x@y.fr', password: PASSWORD })
        .expect(401);
    });

    it('verrouille le numéro après 5 échecs, même avec le bon PIN, sans révéler s’il existe', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      for (let i = 0; i < 5; i += 1) {
        await http().post('/api/auth/login/phone').send({ phone, pin: '000001' }).expect(401);
      }
      const locked = await http().post('/api/auth/login/phone').send({ phone, pin: PIN });
      expect(locked.status).toBe(429);
      expect(locked.body.message).toBe('tooManyAttempts');

      // Un numéro inexistant se verrouille de la même façon : l'attaquant n'apprend rien.
      const ghost = nextPhone();
      for (let i = 0; i < 5; i += 1) {
        await http().post('/api/auth/login/phone').send({ phone: ghost, pin: PIN }).expect(401);
      }
      await http().post('/api/auth/login/phone').send({ phone: ghost, pin: PIN }).expect(429);

      // Le compteur ne garde ni le numéro ni le PIN en clair.
      const rows = await prisma.authRateLimit.findMany({ where: { purpose: 'PHONE_LOGIN' } });
      expect(JSON.stringify(rows)).not.toContain(phone.slice(1));
    });

    it('le verrou expire : le bon PIN refonctionne ensuite', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      for (let i = 0; i < 5; i += 1) {
        await http().post('/api/auth/login/phone').send({ phone, pin: '000001' });
      }
      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(429);
      await prisma.authRateLimit.updateMany({
        where: { purpose: 'PHONE_LOGIN' },
        data: { blockedUntil: new Date(Date.now() - 1000) },
      });
      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(201);
    });

    it('un succès remet le compteur à zéro (4 échecs + succès + 4 échecs ne verrouille pas)', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      const bad = () => http().post('/api/auth/login/phone').send({ phone, pin: '000001' });
      for (let i = 0; i < 4; i += 1) await bad().expect(401);
      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(201);
      for (let i = 0; i < 4; i += 1) await bad().expect(401);
      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(201);
    });

    it('journalise succès et échecs avec un numéro masqué', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      await http().post('/api/auth/login/phone').send({ phone, pin: '000001' });
      await http().post('/api/auth/login/phone').send({ phone, pin: PIN });
      const { userId } = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      const logs = await prisma.authAuditLog.findMany({
        where: { userId, event: 'LOGIN_PHONE' },
        orderBy: { createdAt: 'asc' },
      });
      expect(logs.map((l) => l.status)).toEqual(['FAILURE', 'SUCCESS']);
      expect(logs[0].reasonCode).toBe('INVALID_CREDENTIALS');
      for (const l of logs) expect(l.principal).not.toContain(phone.slice(4, 9));
    });
  });

  describe('récupération du PIN', () => {
    const resetEmailFor = async (email: string) => {
      const deadline = Date.now() + 5000;
      for (;;) {
        const job = await findJobFor(queue, NotificationJob.PIN_RESET_REQUESTED, email);
        if (job || Date.now() > deadline) return job;
        await new Promise((r) => setTimeout(r, 100));
      }
    };

    it('même réponse pour un numéro inconnu, un compte sans email ou un compte avec email', async () => {
      const noEmail = nextPhone();
      await registerPhoneAgent(app, noEmail);
      const answers = [];
      for (const phone of [nextPhone(), noEmail]) {
        const res = await http().post('/api/auth/forgot-pin').send({ phone }).expect(200);
        answers.push(res.body);
      }
      expect(answers[0]).toEqual(answers[1]);
      expect(await queue.getJobs(['waiting', 'completed', 'delayed'])).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ name: NotificationJob.PIN_RESET_REQUESTED }),
        ]),
      );
    });

    it('envoie le lien à l’email vérifié, dans la langue du compte, et le PIN se réinitialise', async () => {
      const phone = nextPhone();
      const email = `pinreset-${counter}@test.fr`;
      const agent = await registerPhoneAgent(app, phone, PIN, { locale: 'en' });
      await prisma.user.update({
        where: {
          id: (await prisma.userPhoneCredential.findUniqueOrThrow({ where: { phoneE164: phone } }))
            .userId,
        },
        data: { email, emailVerifiedAt: new Date() },
      });

      await http().post('/api/auth/forgot-pin').send({ phone }).expect(200);
      const job = await resetEmailFor(email);
      expect(job).toBeDefined();
      expect(job?.data.url).toContain('/en/reset-pin?token=');
      const token = tokenFromUrl(job?.data.url);

      // Le jeton est stocké haché.
      expect(await prisma.authToken.count({ where: { tokenHash: token } })).toBe(0);

      await http().post('/api/auth/reset-pin').send({ token, pin: '739104' }).expect(200);

      // L'ancien PIN ne marche plus, le nouveau oui, l'ancienne session est coupée.
      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(401);
      await http().post('/api/auth/login/phone').send({ phone, pin: '739104' }).expect(201);
      await agent.post('/api/auth/refresh').expect(401);
    });

    it('le lien est à usage unique', async () => {
      const phone = nextPhone();
      const email = `pinonce-${counter}@test.fr`;
      await registerPhoneAgent(app, phone);
      const cred = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      await prisma.user.update({
        where: { id: cred.userId },
        data: { email, emailVerifiedAt: new Date() },
      });
      await http().post('/api/auth/forgot-pin').send({ phone }).expect(200);
      const token = tokenFromUrl((await resetEmailFor(email))?.data.url);

      await http().post('/api/auth/reset-pin').send({ token, pin: '739104' }).expect(200);
      await http().post('/api/auth/reset-pin').send({ token, pin: '846205' }).expect(400);
      await http().post('/api/auth/login/phone').send({ phone, pin: '739104' }).expect(201);
    });

    it('deux utilisations simultanées du même lien : une seule passe', async () => {
      const phone = nextPhone();
      const email = `pinrace-${counter}@test.fr`;
      await registerPhoneAgent(app, phone);
      const cred = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      await prisma.user.update({
        where: { id: cred.userId },
        data: { email, emailVerifiedAt: new Date() },
      });
      await http().post('/api/auth/forgot-pin').send({ phone }).expect(200);
      const token = tokenFromUrl((await resetEmailFor(email))?.data.url);

      const statuses = (
        await Promise.all([
          http().post('/api/auth/reset-pin').send({ token, pin: '739104' }),
          http().post('/api/auth/reset-pin').send({ token, pin: '846205' }),
        ])
      )
        .map((r) => r.status)
        .sort();
      expect(statuses).toEqual([200, 400]);
    });

    it('lève le verrou posé par des essais ratés', async () => {
      const phone = nextPhone();
      const email = `pinunlock-${counter}@test.fr`;
      await registerPhoneAgent(app, phone);
      const cred = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      await prisma.user.update({
        where: { id: cred.userId },
        data: { email, emailVerifiedAt: new Date() },
      });
      for (let i = 0; i < 5; i += 1) {
        await http().post('/api/auth/login/phone').send({ phone, pin: '000001' });
      }
      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(429);

      await http().post('/api/auth/forgot-pin').send({ phone }).expect(200);
      const token = tokenFromUrl((await resetEmailFor(email))?.data.url);
      await http().post('/api/auth/reset-pin').send({ token, pin: '739104' }).expect(200);
      await http().post('/api/auth/login/phone').send({ phone, pin: '739104' }).expect(201);
    });

    it('n’envoie rien si l’email du compte n’a jamais été confirmé', async () => {
      const phone = nextPhone();
      const email = `pinunverified-${counter}@test.fr`;
      await registerPhoneAgent(app, phone);
      const cred = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      await prisma.user.update({
        where: { id: cred.userId },
        data: { email, emailVerifiedAt: null },
      });
      await http().post('/api/auth/forgot-pin').send({ phone }).expect(200);
      await new Promise((r) => setTimeout(r, 400));
      expect(await findJobFor(queue, NotificationJob.PIN_RESET_REQUESTED, email)).toBeUndefined();
    });

    it('refuse un jeton inconnu ou un PIN trop simple', async () => {
      await http()
        .post('/api/auth/reset-pin')
        .send({ token: 'inconnu', pin: '739104' })
        .expect(400);
      await http()
        .post('/api/auth/reset-pin')
        .send({ token: 'inconnu', pin: '111111' })
        .expect(400);
    });

    it('un lien de réinitialisation de MOT DE PASSE ne sert pas à changer le PIN', async () => {
      const phone = nextPhone();
      const email = `pinwrongkind-${counter}@test.fr`;
      await registerPhoneAgent(app, phone);
      const cred = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      await prisma.user.update({
        where: { id: cred.userId },
        data: { email, emailVerifiedAt: new Date() },
      });
      await http().post('/api/auth/forgot-password').send({ email }).expect(200);
      const job = await findJobFor(queue, NotificationJob.PASSWORD_RESET_REQUESTED, email);
      const token = tokenFromUrl(job?.data.url);
      await http().post('/api/auth/reset-pin').send({ token, pin: '739104' }).expect(400);
    });

    it('limite les demandes par numéro (pas d’inondation de la boîte mail)', async () => {
      const phone = nextPhone();
      for (let i = 0; i < 5; i += 1) {
        await http().post('/api/auth/forgot-pin').send({ phone }).expect(200);
      }
      await http().post('/api/auth/forgot-pin').send({ phone }).expect(429);
    });
  });

  describe('réinitialisation par un administrateur de la plateforme', () => {
    const makeAdmin = async (email: string) => {
      const agent = await registerAgent(app, email);
      await prisma.user.update({ where: { email }, data: { role: 'SUPER_ADMIN' } });
      return agent;
    };

    it('refuse un visiteur (401) et un utilisateur ordinaire (403)', async () => {
      await http().post('/api/admin/auth/pin-reset-link').send({ phone: nextPhone() }).expect(401);
      const user = await registerAgent(app, 'ordinaire-admin@test.fr');
      await user
        .post('/api/admin/auth/pin-reset-link')
        .send({ phone: nextPhone() })
        .expect(403)
        .expect((res) => expect(res.body.message.message).toBe('forbiddenPlatform'));
    });

    it('un administrateur de paroisse n’est pas un administrateur de la plateforme', async () => {
      const agent = await registerAgent(app, 'parishadmin-plat@test.fr');
      const created = await agent
        .post('/api/parishes')
        .send({ name: 'Paroisse Test', city: 'Yaoundé', country: 'Cameroun' });
      expect([200, 201]).toContain(created.status);
      await agent.post('/api/admin/auth/pin-reset-link').send({ phone: nextPhone() }).expect(403);
    });

    it('fabrique un lien valable 24 h qui réinitialise le PIN, et le journalise', async () => {
      const phone = nextPhone();
      await registerPhoneAgent(app, phone);
      const admin = await makeAdmin('admin-plat@test.fr');

      const res = await admin.post('/api/admin/auth/pin-reset-link').send({ phone }).expect(200);
      expect(res.body.url).toContain('/fr/reinitialisation-pin?token=');
      expect(res.body).toMatchObject({ firstName: 'Jean', lastName: 'Dupont' });
      const hours = (new Date(res.body.expiresAt).getTime() - Date.now()) / 3_600_000;
      expect(hours).toBeGreaterThan(23);
      expect(hours).toBeLessThanOrEqual(24);

      await http()
        .post('/api/auth/reset-pin')
        .send({ token: tokenFromUrl(res.body.url), pin: '739104' })
        .expect(200);
      await http().post('/api/auth/login/phone').send({ phone, pin: '739104' }).expect(201);

      const log = await prisma.authAuditLog.findFirstOrThrow({
        where: { event: 'PIN_RESET_ISSUED_BY_ADMIN' },
        orderBy: { createdAt: 'desc' },
      });
      expect(log.reasonCode).toMatch(/^admin:/);
    });

    it('404 si aucun compte n’a ce numéro', async () => {
      const admin = await makeAdmin('admin-plat2@test.fr');
      await admin
        .post('/api/admin/auth/pin-reset-link')
        .send({ phone: nextPhone() })
        .expect(404)
        .expect((res) => expect(res.body.message.message).toBe('userNotFoundByPhone'));
    });
  });
});
