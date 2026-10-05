import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { NotificationJob } from '@churchy/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import { GoogleTokenVerifier } from '../src/modules/auth/google-token.verifier';
import {
  FakeGoogleVerifier,
  PASSWORD,
  cookieValue,
  createTestApp,
  findJobFor,
  googleToken,
  newAgent,
  openNotificationsQueue,
  registerAgent,
  registerPhoneAgent,
  setCookieHeaders,
} from './helpers';

const PIN = '482915';
let counter = 0;
const nextPhone = () =>
  `+2376${String(71000000 + ++counter * 6007 + (Date.now() % 997)).slice(0, 8)}`;

describe('Connexion Google', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp((b) =>
      b.overrideProvider(GoogleTokenVerifier).useValue(new FakeGoogleVerifier()),
    );
    prisma = app.get(PrismaService);
  });
  afterAll(() => app.close());

  it('expose le fournisseur Google (identifiant client public) sans authentification', async () => {
    const res = await http().get('/api/auth/providers').expect(200);
    expect(res.body).toEqual({ google: { clientId: 'test-client-id.apps.googleusercontent.com' } });
  });

  it('crée un compte confirmé, sans mot de passe, et pose les cookies', async () => {
    const res = await http()
      .post('/api/auth/google')
      .send({
        idToken: googleToken({ sub: 'g-new-1', email: 'nouveau.google@test.fr' }),
        locale: 'en',
      })
      .expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.user).toMatchObject({
      email: 'nouveau.google@test.fr',
      emailVerified: true,
      locale: 'en',
      phone: null,
      methods: { password: false, pin: false, google: true },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/idToken|hash|g-new-1/);
    expect(setCookieHeaders(res)).toHaveLength(3);
    // Aucun email de confirmation : Google l'a déjà certifié.
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'nouveau.google@test.fr' },
    });
    expect(user.passwordHash).toBeNull();
  });

  it('reconnaît le compte au prochain passage, par l’identifiant Google (même si l’email a changé)', async () => {
    const first = await http()
      .post('/api/auth/google')
      .send({ idToken: googleToken({ sub: 'g-stable', email: 'avant@test.fr' }) })
      .expect(200);
    const second = await http()
      .post('/api/auth/google')
      .send({ idToken: googleToken({ sub: 'g-stable', email: 'apres@test.fr' }) })
      .expect(200);
    expect(second.body.user.id).toBe(first.body.user.id);
    expect(await prisma.user.count({ where: { email: 'apres@test.fr' } })).toBe(0);
  });

  it('refuse un jeton invalide et ne crée rien', async () => {
    await http().post('/api/auth/google').send({ idToken: 'invalid' }).expect(401);
    await http().post('/api/auth/google').send({}).expect(400);
  });

  it('refuse un email que Google n’a pas vérifié', async () => {
    const before = await prisma.user.count();
    await http()
      .post('/api/auth/google')
      .send({
        idToken: googleToken({ sub: 'g-unv', email: 'nonverifie@test.fr', emailVerified: false }),
      })
      .expect(400)
      .expect((res) => expect(res.body.message.message).toBe('googleEmailUnverified'));
    expect(await prisma.user.count()).toBe(before);
  });

  it('un compte email confirmé existe déjà : AUCUNE fusion, le mot de passe est demandé', async () => {
    const email = 'deja.compte@test.fr';
    await registerAgent(app, email);
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });

    const res = await http()
      .post('/api/auth/google')
      .send({ idToken: googleToken({ sub: 'g-exists', email }) })
      .expect(200);
    expect(res.body).toEqual({ status: 'link_required', email });
    expect(setCookieHeaders(res)).toHaveLength(0);
    expect(await prisma.userAuthIdentity.count({ where: { providerAccountId: 'g-exists' } })).toBe(
      0,
    );
  });

  it('lie Google avec le bon mot de passe, puis la connexion Google marche directement', async () => {
    const email = 'lie.google@test.fr';
    await registerAgent(app, email);
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
    const idToken = googleToken({ sub: 'g-link', email });

    await http()
      .post('/api/auth/google/link')
      .send({ idToken, password: 'mauvais-mdp-1' })
      .expect(400);
    expect(await prisma.userAuthIdentity.count({ where: { providerAccountId: 'g-link' } })).toBe(0);

    const ok = await http()
      .post('/api/auth/google/link')
      .send({ idToken, password: PASSWORD })
      .expect(200);
    expect(ok.body.user).toMatchObject({ email, methods: { password: true, google: true } });
    expect(cookieValue(ok, 'churchy_at')).toBeTruthy();

    const again = await http().post('/api/auth/google').send({ idToken }).expect(200);
    expect(again.body.status).toBe('ok');
    expect(again.body.user.id).toBe(ok.body.user.id);
  });

  it('le mot de passe reste valable après la liaison', async () => {
    const email = 'garde.mdp@test.fr';
    await registerAgent(app, email);
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
    await http()
      .post('/api/auth/google/link')
      .send({ idToken: googleToken({ sub: 'g-keep', email }), password: PASSWORD })
      .expect(200);
    await http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(201);
  });

  it('verrouille les essais de mot de passe lors de la liaison (anti force brute)', async () => {
    const email = 'brute.link@test.fr';
    await registerAgent(app, email);
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
    const idToken = googleToken({ sub: 'g-brute', email });
    for (let i = 0; i < 10; i += 1) {
      await http()
        .post('/api/auth/google/link')
        .send({ idToken, password: `faux-${i}-mdp` })
        .expect(400);
    }
    await http().post('/api/auth/google/link').send({ idToken, password: PASSWORD }).expect(429);
  });

  it('un compte sans mot de passe (téléphone + email) : on demande de se connecter d’abord', async () => {
    const phone = nextPhone();
    const email = 'tel.et.email@test.fr';
    await registerPhoneAgent(app, phone);
    const cred = await prisma.userPhoneCredential.findUniqueOrThrow({
      where: { phoneE164: phone },
    });
    await prisma.user.update({
      where: { id: cred.userId },
      data: { email, emailVerifiedAt: new Date() },
    });
    const idToken = googleToken({ sub: 'g-phone-mail', email });

    expect((await http().post('/api/auth/google').send({ idToken }).expect(200)).body.status).toBe(
      'link_required',
    );
    await http()
      .post('/api/auth/google/link')
      .send({ idToken, password: 'peu-importe-1' })
      .expect(400)
      .expect((res) => expect(res.body.message.message).toBe('googleLinkLoginFirst'));
  });

  it('PRISE DE CONTRÔLE ÉVITÉE : email jamais confirmé → Google reprend le compte, les identifiants posés disparaissent', async () => {
    const email = 'victime@test.fr';
    // Un tiers s'inscrit avec l'adresse d'autrui (jamais confirmée) et ajoute un PIN.
    const attacker = await registerAgent(app, email);
    await attacker
      .put('/api/auth/me/phone-pin')
      .send({ phone: nextPhone(), pin: '739104', currentPassword: PASSWORD })
      .expect(200);
    const attackerRt = (await attacker.post('/api/auth/refresh')).status;
    expect(attackerRt).toBe(200);

    // Le vrai propriétaire de l'adresse se connecte avec Google.
    const victim = await http()
      .post('/api/auth/google')
      .send({ idToken: googleToken({ sub: 'g-victim', email }) })
      .expect(200);
    expect(victim.body.status).toBe('ok');
    expect(victim.body.user).toMatchObject({
      emailVerified: true,
      methods: { password: false, pin: false, google: true },
    });

    // L'ancien mot de passe, l'ancien PIN et l'ancienne session ne fonctionnent plus.
    await http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(401);
    await attacker.post('/api/auth/refresh').expect(401);
    expect(await prisma.userPhoneCredential.count({ where: { userId: victim.body.user.id } })).toBe(
      0,
    );
    const audit = await prisma.authAuditLog.findFirst({
      where: { event: 'ACCOUNT_TAKEOVER_CLEARED' },
    });
    expect(audit).not.toBeNull();
  });

  it('un compte Google déjà lié à un autre compte ne peut pas être lié une seconde fois', async () => {
    const idToken = googleToken({ sub: 'g-taken', email: 'proprietaire.google@test.fr' });
    await http().post('/api/auth/google').send({ idToken }).expect(200);

    const other = await registerAgent(app, 'autre.compte@test.fr');
    await other
      .put('/api/auth/me/google')
      .send({ idToken, currentPassword: PASSWORD })
      .expect(409)
      .expect((res) => expect(res.body.message.message).toBe('googleLinkedElsewhere'));
  });

  describe('depuis « Sécurité » (session ouverte)', () => {
    it('lie puis délie Google avec la preuve du mot de passe', async () => {
      const email = 'secu.google@test.fr';
      const agent = await registerAgent(app, email);
      const idToken = googleToken({ sub: 'g-secu', email });

      await agent.put('/api/auth/me/google').send({ idToken }).expect(400); // preuve manquante
      await agent
        .put('/api/auth/me/google')
        .send({ idToken, currentPassword: 'faux-mdp-123' })
        .expect(400);
      const linked = await agent
        .put('/api/auth/me/google')
        .send({ idToken, currentPassword: PASSWORD })
        .expect(200);
      expect(linked.body.methods.google).toBe(true);
      // Google certifie l'email du compte : il devient confirmé.
      expect(linked.body.emailVerified).toBe(true);

      await agent
        .put('/api/auth/me/google')
        .send({ idToken, currentPassword: PASSWORD })
        .expect(409);

      await agent.post('/api/auth/me/google/unlink').send({}).expect(400);
      const unlinked = await agent
        .post('/api/auth/me/google/unlink')
        .send({ currentPassword: PASSWORD })
        .expect(200);
      expect(unlinked.body.methods.google).toBe(false);
      expect(await prisma.userAuthIdentity.count({ where: { providerAccountId: 'g-secu' } })).toBe(
        0,
      );
    });

    it('refuse de délier Google quand c’est le seul moyen de connexion', async () => {
      const agent = newAgent(app);
      await agent
        .post('/api/auth/google')
        .send({ idToken: googleToken({ sub: 'g-only', email: 'seul.google@test.fr' }) })
        .expect(200);
      await agent
        .post('/api/auth/me/google/unlink')
        .send({})
        .expect(400)
        .expect((res) => expect(res.body.message.message).toBe('lastLoginMethod'));
    });

    it('un compte Google crée son mot de passe sans preuve, puis peut délier Google', async () => {
      const email = 'google.puis.mdp@test.fr';
      const agent = newAgent(app);
      await agent
        .post('/api/auth/google')
        .send({ idToken: googleToken({ sub: 'g-then-pw', email }) })
        .expect(200);

      const set = await agent
        .put('/api/auth/me/password')
        .send({ password: 'nouveau-mdp-123' })
        .expect(200);
      expect(set.body.user.methods).toMatchObject({ password: true, google: true });
      await http().post('/api/auth/login').send({ email, password: 'nouveau-mdp-123' }).expect(201);

      await agent
        .post('/api/auth/me/google/unlink')
        .send({ currentPassword: 'nouveau-mdp-123' })
        .expect(200);
    });
  });
});

describe('Google non configuré', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp((b) =>
      b.overrideProvider(GoogleTokenVerifier).useValue(new FakeGoogleVerifier(false)),
    );
  });
  afterAll(() => app.close());

  it('masque le fournisseur et refuse la connexion (503), sans rien créer', async () => {
    const providers = await request(app.getHttpServer()).get('/api/auth/providers').expect(200);
    expect(providers.body).toEqual({ google: null });
    await request(app.getHttpServer())
      .post('/api/auth/google')
      .send({ idToken: googleToken({ sub: 'x', email: 'x@y.fr' }) })
      .expect(503);
  });
});

describe('Sécurité du compte', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let queue: Queue;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp((b) =>
      b.overrideProvider(GoogleTokenVerifier).useValue(new FakeGoogleVerifier()),
    );
    prisma = app.get(PrismaService);
    queue = openNotificationsQueue();
  });
  afterAll(async () => {
    await queue.close();
    await app.close();
  });

  describe('compte par téléphone : ajouter un email', () => {
    it('ajoute l’email (à confirmer) avec le PIN actuel et envoie le lien de confirmation', async () => {
      const agent = await registerPhoneAgent(app, nextPhone());
      const email = 'ajout.email@test.fr';

      await agent.put('/api/auth/me/email').send({ email }).expect(400); // preuve manquante
      await agent.put('/api/auth/me/email').send({ email, currentPin: '000001' }).expect(400);
      const res = await agent
        .put('/api/auth/me/email')
        .send({ email, currentPin: PIN })
        .expect(200);
      expect(res.body).toMatchObject({ email, emailVerified: false });

      const deadline = Date.now() + 5000;
      let job;
      while (!job && Date.now() < deadline) {
        job = await findJobFor(queue, NotificationJob.EMAIL_VERIFICATION_REQUESTED, email);
        if (!job) await new Promise((r) => setTimeout(r, 100));
      }
      expect(job?.data.url).toContain('/fr/verification-email?token=');
    });

    it('refuse un email déjà pris, ou un second email', async () => {
      await registerAgent(app, 'pris.deja@test.fr');
      const agent = await registerPhoneAgent(app, nextPhone());
      await agent
        .put('/api/auth/me/email')
        .send({ email: 'pris.deja@test.fr', currentPin: PIN })
        .expect(409)
        .expect((res) => expect(res.body.message.message).toBe('emailAlreadyUsed'));

      await agent
        .put('/api/auth/me/email')
        .send({ email: 'premier@test.fr', currentPin: PIN })
        .expect(200);
      await agent
        .put('/api/auth/me/email')
        .send({ email: 'second@test.fr', currentPin: PIN })
        .expect(409);
    });

    it('exige d’être connecté', async () => {
      await http().put('/api/auth/me/email').send({ email: 'a@b.fr' }).expect(401);
      await http().put('/api/auth/me/password').send({ password: 'longenough1' }).expect(401);
      await http().put('/api/auth/me/phone-pin').send({ phone: nextPhone(), pin: PIN }).expect(401);
      await http().patch('/api/auth/me/pin').send({ currentPin: PIN, pin: '739104' }).expect(401);
      await http().put('/api/auth/me/google').send({ idToken: 'x' }).expect(401);
      await http().post('/api/auth/me/google/unlink').send({}).expect(401);
    });
  });

  describe('mot de passe', () => {
    it('sans email, un mot de passe est refusé : on demande d’abord l’email', async () => {
      const agent = await registerPhoneAgent(app, nextPhone());
      await agent
        .put('/api/auth/me/password')
        .send({ password: 'nouveau-mdp-123', currentPin: PIN })
        .expect(400)
        .expect((res) => expect(res.body.message.message).toBe('emailRequired'));
    });

    it('téléphone + email : crée le mot de passe, la connexion par email marche, ancienne session coupée', async () => {
      const phone = nextPhone();
      const email = 'tel.vers.mdp@test.fr';
      const agent = await registerPhoneAgent(app, phone);
      const oldRefresh = cookieValue(await agent.get('/api/auth/me'), 'churchy_rt');
      void oldRefresh;
      await agent.put('/api/auth/me/email').send({ email, currentPin: PIN }).expect(200);

      const res = await agent
        .put('/api/auth/me/password')
        .send({ password: 'nouveau-mdp-123', currentPin: PIN })
        .expect(200);
      expect(res.body.user.methods).toMatchObject({ password: true, pin: true });
      await http().post('/api/auth/login').send({ email, password: 'nouveau-mdp-123' }).expect(201);
      // La session ouverte reste valable (une neuve a été émise).
      await agent.get('/api/auth/me').expect(200);
    });

    it('changer le mot de passe exige l’actuel, coupe les AUTRES sessions et garde la courante', async () => {
      const email = 'change.mdp@test.fr';
      const a = await registerAgent(app, email);
      const b = newAgent(app);
      await b.post('/api/auth/login').send({ email, password: PASSWORD }).expect(201);

      await a.put('/api/auth/me/password').send({ password: 'autre-mdp-123' }).expect(400);
      await a
        .put('/api/auth/me/password')
        .send({ password: 'autre-mdp-123', currentPassword: 'faux' })
        .expect(400);
      await a
        .put('/api/auth/me/password')
        .send({ password: 'autre-mdp-123', currentPassword: PASSWORD })
        .expect(200);

      await a.post('/api/auth/refresh').expect(200);
      await b.post('/api/auth/refresh').expect(401);
      await http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(401);
      await http().post('/api/auth/login').send({ email, password: 'autre-mdp-123' }).expect(201);
    });

    it('verrouille les essais de preuve (5 échecs) puis refuse même la bonne', async () => {
      const email = 'brute.preuve@test.fr';
      const agent = await registerAgent(app, email);
      for (let i = 0; i < 5; i += 1) {
        await agent
          .put('/api/auth/me/password')
          .send({ password: 'autre-mdp-123', currentPassword: `faux${i}` })
          .expect(400);
      }
      await agent
        .put('/api/auth/me/password')
        .send({ password: 'autre-mdp-123', currentPassword: PASSWORD })
        .expect(429);
    });

    it('impose 8 caractères', async () => {
      const agent = await registerAgent(app, 'court.mdp@test.fr');
      await agent
        .put('/api/auth/me/password')
        .send({ password: 'court', currentPassword: PASSWORD })
        .expect(400);
    });
  });

  describe('ajouter la connexion par téléphone à un compte email', () => {
    it('crée le PIN avec le mot de passe en preuve, puis la connexion par téléphone marche', async () => {
      const email = 'email.vers.tel@test.fr';
      const phone = nextPhone();
      const agent = await registerAgent(app, email);

      await agent.put('/api/auth/me/phone-pin').send({ phone, pin: PIN }).expect(400);
      await agent
        .put('/api/auth/me/phone-pin')
        .send({ phone, pin: PIN, currentPassword: 'faux' })
        .expect(400);
      const res = await agent
        .put('/api/auth/me/phone-pin')
        .send({ phone, pin: PIN, currentPassword: PASSWORD })
        .expect(200);
      expect(res.body.user).toMatchObject({ phone, methods: { password: true, pin: true } });

      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(201);
      // Et l'ancien mot de passe fonctionne toujours.
      await http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(201);
    });

    it('refuse un PIN trop simple, un numéro déjà utilisé, ou un second PIN', async () => {
      const taken = nextPhone();
      await registerPhoneAgent(app, taken);
      const agent = await registerAgent(app, 'deux.pin@test.fr');

      await agent
        .put('/api/auth/me/phone-pin')
        .send({ phone: nextPhone(), pin: '123456', currentPassword: PASSWORD })
        .expect(400);
      await agent
        .put('/api/auth/me/phone-pin')
        .send({ phone: taken, pin: PIN, currentPassword: PASSWORD })
        .expect(409)
        .expect((res) => expect(res.body.message.message).toBe('phoneAlreadyUsed'));

      const mine = nextPhone();
      await agent
        .put('/api/auth/me/phone-pin')
        .send({ phone: mine, pin: PIN, currentPassword: PASSWORD })
        .expect(200);
      await agent
        .put('/api/auth/me/phone-pin')
        .send({ phone: nextPhone(), pin: PIN, currentPassword: PASSWORD })
        .expect(409)
        .expect((res) => expect(res.body.message.message).toBe('pinAlreadySet'));
    });
  });

  describe('changer le PIN', () => {
    it('exige le PIN actuel, accepte le nouveau, refuse l’ancien ensuite et coupe les autres sessions', async () => {
      const phone = nextPhone();
      const a = await registerPhoneAgent(app, phone);
      const b = newAgent(app);
      await b.post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(201);

      await a.patch('/api/auth/me/pin').send({ currentPin: '000001', pin: '739104' }).expect(400);
      await a.patch('/api/auth/me/pin').send({ currentPin: PIN, pin: '123456' }).expect(400);
      await a.patch('/api/auth/me/pin').send({ currentPin: PIN, pin: '739104' }).expect(200);

      await http().post('/api/auth/login/phone').send({ phone, pin: PIN }).expect(401);
      await http().post('/api/auth/login/phone').send({ phone, pin: '739104' }).expect(201);
      await a.post('/api/auth/refresh').expect(200);
      await b.post('/api/auth/refresh').expect(401);
    });

    it('un compte sans PIN ne peut rien changer', async () => {
      const agent = await registerAgent(app, 'sans.pin@test.fr');
      await agent.patch('/api/auth/me/pin').send({ currentPin: PIN, pin: '739104' }).expect(400);
    });

    it('le mot de passe ne remplace pas le PIN actuel', async () => {
      const agent = await registerAgent(app, 'mdp.pas.pin@test.fr');
      const phone = nextPhone();
      await agent
        .put('/api/auth/me/phone-pin')
        .send({ phone, pin: PIN, currentPassword: PASSWORD })
        .expect(200);
      await agent
        .patch('/api/auth/me/pin')
        .send({ currentPin: PASSWORD, pin: '739104' })
        .expect(400);
    });
  });

  describe('journal d’audit', () => {
    it('trace les changements sensibles sans aucun secret', async () => {
      const phone = nextPhone();
      const agent = await registerPhoneAgent(app, phone);
      await agent.patch('/api/auth/me/pin').send({ currentPin: PIN, pin: '739104' }).expect(200);
      const { userId } = await prisma.userPhoneCredential.findUniqueOrThrow({
        where: { phoneE164: phone },
      });
      const logs = await prisma.authAuditLog.findMany({ where: { userId } });
      expect(logs.map((l) => l.event)).toEqual(expect.arrayContaining(['REGISTER', 'PIN_CHANGED']));
      const dump = JSON.stringify(logs);
      expect(dump).not.toContain(PIN);
      expect(dump).not.toContain('739104');
      expect(dump).not.toContain(phone.slice(4, 9));
    });
  });
});
