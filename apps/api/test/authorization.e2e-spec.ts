import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { Agent, createTestApp, onDays, registerAgent } from './helpers';

/**
 * Matrice d'autorisations : qui (visiteur, non-membre, fidèle, paroissien, lecteur, préparateur, rédacteur, admin) peut faire quoi,
 * sur les routes qui visent une paroisse directement ou via une de ses ressources.
 */
describe('Autorisations par paroisse', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let admin: Agent;
  let preparer: Agent;
  let reader: Agent;
  let announcer: Agent;
  let parishioner: Agent;
  let faithful: Agent;
  let stranger: Agent;
  let otherAdmin: Agent;

  // Ressources de la paroisse A (celle qu'on protège) et de la paroisse B (autre paroisse).
  const a = {
    parishId: '',
    templateId: '',
    stepId: '',
    contentId: '',
    celebrationId: '',
    occurrenceId: '',
    sheetId: '',
    celebStepId: '',
    announcementId: '',
    activityId: '',
  };
  const b = {
    parishId: '',
    templateId: '',
    stepId: '',
    contentId: '',
    celebrationId: '',
    occurrenceId: '',
    sheetId: '',
    celebStepId: '',
    announcementId: '',
    activityId: '',
  };

  const makeParish = async (owner: Agent, name: string) =>
    (await owner.post('/api/parishes').send({ name, city: 'Lyon', country: 'France' }).expect(201))
      .body.id as string;

  const addMember = async (
    email: string,
    parishId: string,
    status: 'FAITHFUL' | 'PARISHIONER',
    duties: ('PREPARER' | 'READER' | 'ANNOUNCER')[] = [],
  ) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.parishMember.create({ data: { userId: user.id, parishId, status, duties } });
  };

  const seed = async (owner: Agent, parishId: string, suffix: string) => {
    const tpl = await owner
      .post(`/api/parishes/${parishId}/templates`)
      .send({ name: `Messe ${suffix}`, type: 'SUNDAY_MASS' })
      .expect(201);
    const step = await owner
      .post(`/api/templates/${tpl.body.id}/steps`)
      .send({ title: 'Première lecture', key: 'reading-1', order: 1 })
      .expect(201);
    const content = await owner
      .post(`/api/parishes/${parishId}/contents`)
      .send({ title: `Lecture ${suffix}`, type: 'READING', body: 'Texte' })
      .expect(201);
    const celebration = await owner
      .post(`/api/parishes/${parishId}/celebrations`)
      .send({
        templateId: tpl.body.id,
        title: `Messe ${suffix}`,
        type: 'SUNDAY_MASS',
        internalNote: `Note interne ${suffix}`,
        schedule: onDays(3, 10),
      })
      .expect(201);
    const occurrenceId = celebration.body.occurrences[0].id as string;
    // La feuille naît à la demande, avec les étapes du modèle par défaut.
    const sheet = await owner.post(`/api/occurrences/${occurrenceId}/sheet`).send({}).expect(201);
    const announcement = await owner
      .post(`/api/parishes/${parishId}/announcements`)
      .send({ title: `Annonce ${suffix}`, body: 'Texte' })
      .expect(201);
    const activity = await owner
      .post(`/api/parishes/${parishId}/activities`)
      .send({
        title: `Activité ${suffix}`,
        description: 'Texte',
        startsAt: '2027-01-10T18:00:00.000Z',
      })
      .expect(201);
    return {
      announcementId: announcement.body.id as string,
      activityId: activity.body.id as string,
      templateId: tpl.body.id as string,
      stepId: step.body.id as string,
      contentId: content.body.id as string,
      celebrationId: celebration.body.id as string,
      occurrenceId,
      sheetId: sheet.body.id as string,
      celebStepId: sheet.body.steps[0].id as string,
    };
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    admin = await registerAgent(app, 'authz-admin@test.fr');
    preparer = await registerAgent(app, 'authz-preparer@test.fr');
    reader = await registerAgent(app, 'authz-reader@test.fr');
    announcer = await registerAgent(app, 'authz-announcer@test.fr');
    parishioner = await registerAgent(app, 'authz-parishioner@test.fr');
    faithful = await registerAgent(app, 'authz-faithful@test.fr');
    stranger = await registerAgent(app, 'authz-stranger@test.fr');
    otherAdmin = await registerAgent(app, 'authz-other@test.fr');

    a.parishId = await makeParish(admin, 'Paroisse Authz A');
    await addMember('authz-preparer@test.fr', a.parishId, 'PARISHIONER', ['PREPARER']);
    await addMember('authz-reader@test.fr', a.parishId, 'PARISHIONER', ['READER']);
    await addMember('authz-announcer@test.fr', a.parishId, 'PARISHIONER', ['ANNOUNCER']);
    await addMember('authz-parishioner@test.fr', a.parishId, 'PARISHIONER');
    await addMember('authz-faithful@test.fr', a.parishId, 'FAITHFUL');
    Object.assign(a, await seed(admin, a.parishId, 'A'));

    b.parishId = await makeParish(otherAdmin, 'Paroisse Authz B');
    Object.assign(b, await seed(otherAdmin, b.parishId, 'B'));
  });

  afterAll(async () => {
    await app.close();
  });

  type Call = (agent: Agent) => request.Test;
  const routes = (): Record<string, { read: boolean; call: Call }> => ({
    'GET  parishes/:id': { read: true, call: (x) => x.get(`/api/parishes/${a.parishId}`) },
    'GET  contents (liste)': {
      read: true,
      call: (x) => x.get(`/api/parishes/${a.parishId}/contents`),
    },
    'GET  content': { read: true, call: (x) => x.get(`/api/contents/${a.contentId}`) },
    'POST content': {
      read: false,
      call: (x) =>
        x
          .post(`/api/parishes/${a.parishId}/contents`)
          .send({ title: 'Nouveau', type: 'PRAYER', body: 'Texte' }),
    },
    'GET  templates (liste)': {
      read: true,
      call: (x) => x.get(`/api/parishes/${a.parishId}/templates`),
    },
    'GET  template': { read: true, call: (x) => x.get(`/api/templates/${a.templateId}`) },
    'POST template': {
      read: false,
      call: (x) =>
        x.post(`/api/parishes/${a.parishId}/templates`).send({ name: 'Autre', type: 'WEDDING' }),
    },
    'POST template step': {
      read: false,
      call: (x) =>
        x
          .post(`/api/templates/${a.templateId}/steps`)
          .send({ title: 'Étape', key: `k-${Math.random()}`, order: 9 }),
    },
    'GET  celebrations (liste)': {
      read: true,
      call: (x) => x.get(`/api/parishes/${a.parishId}/celebrations`),
    },
    'GET  celebration': { read: true, call: (x) => x.get(`/api/celebrations/${a.celebrationId}`) },
    'POST celebration': {
      read: false,
      call: (x) =>
        x
          .post(`/api/parishes/${a.parishId}/celebrations`)
          .send({ title: 'Autre', type: 'SUNDAY_MASS', schedule: onDays(20) }),
    },
    'PATCH celebration': {
      read: false,
      call: (x) => x.patch(`/api/celebrations/${a.celebrationId}`).send({ title: 'Renommée' }),
    },
    'POST celebration occurrences (prolonger)': {
      read: false,
      call: (x) =>
        x.post(`/api/celebrations/${a.celebrationId}/occurrences`).send({ schedule: onDays(30) }),
    },
    'GET  occurrence': { read: true, call: (x) => x.get(`/api/occurrences/${a.occurrenceId}`) },
    'PATCH occurrence': {
      read: false,
      call: (x) => x.patch(`/api/occurrences/${a.occurrenceId}`).send({ internalNote: 'N' }),
    },
    'POST occurrence sheet': {
      read: false,
      call: (x) => x.post(`/api/occurrences/${a.occurrenceId}/sheet`).send({}),
    },
    'GET  sheet': { read: true, call: (x) => x.get(`/api/sheets/${a.sheetId}`) },
    'PATCH sheet template': {
      read: false,
      call: (x) =>
        x
          .patch(`/api/sheets/${a.sheetId}/template`)
          .send({ templateId: a.templateId, dryRun: true }),
    },
    'POST sheet step': {
      read: false,
      call: (x) => x.post(`/api/sheets/${a.sheetId}/steps`).send({ title: 'Chant libre' }),
    },
    'PATCH sheet step': {
      read: false,
      call: (x) =>
        x
          .patch(`/api/sheets/${a.sheetId}/steps/${a.celebStepId}`)
          .send({ customText: 'Texte libre' }),
    },
    'GET  announcements': {
      read: true,
      call: (x) => x.get(`/api/parishes/${a.parishId}/announcements`),
    },
    'POST announcement': {
      read: false,
      call: (x) =>
        x.post(`/api/parishes/${a.parishId}/announcements`).send({ title: 'N', body: 'Texte' }),
    },
    'GET  activities': {
      read: true,
      call: (x) => x.get(`/api/parishes/${a.parishId}/activities`),
    },
    'POST activity': {
      read: false,
      call: (x) =>
        x.post(`/api/parishes/${a.parishId}/activities`).send({
          title: 'A',
          description: 'Texte',
          startsAt: '2027-02-01T18:00:00.000Z',
        }),
    },
    'PATCH parish (infos publiques)': {
      read: false,
      call: (x) => x.patch(`/api/parishes/${a.parishId}`).send({ address: '1 rue du Test' }),
    },
    'GET  members': { read: false, call: (x) => x.get(`/api/parishes/${a.parishId}/members`) },
  });

  // Routes destructrices ou à effet de bord : jouées en dernier, sur leur propre ressource.
  const mutating = (): Record<string, Call> => ({
    'POST publish sheet': (x) => x.post(`/api/sheets/${a.sheetId}/publish`),
    'POST unpublish sheet': (x) => x.post(`/api/sheets/${a.sheetId}/unpublish`),
    'POST cancel occurrence': (x) => x.post(`/api/occurrences/${a.occurrenceId}/cancel`).send({}),
    'POST reinstate occurrence': (x) => x.post(`/api/occurrences/${a.occurrenceId}/reinstate`),
    'POST archive': (x) => x.post(`/api/celebrations/${a.celebrationId}/archive`),
    'PATCH content': (x) => x.patch(`/api/contents/${a.contentId}`).send({ title: 'Modifié' }),
    'DELETE announcement': (x) =>
      x.delete(`/api/parishes/${a.parishId}/announcements/${a.announcementId}`),
    'DELETE activity': (x) => x.delete(`/api/parishes/${a.parishId}/activities/${a.activityId}`),
    'DELETE content': (x) => x.delete(`/api/contents/${a.contentId}`),
    'DELETE template step': (x) => x.delete(`/api/templates/steps/${a.stepId}`),
  });

  const names = Object.keys(routes());
  const mutNames = Object.keys(mutating());

  it.each(names)('visiteur anonyme : 401 sur %s', async (name) => {
    const r = routes()[name].call(request.agent(app.getHttpServer()));
    await r.expect(401);
  });

  it.each([...names, ...mutNames])('non-membre : 403 sur %s', async (name) => {
    const call = routes()[name]?.call ?? mutating()[name];
    await call(stranger).expect(403);
  });

  /**
   * Permissions attendues par route (écrites ici en clair, indépendamment du code testé) :
   * view = tout fidèle ; internal = lecteur, préparateur, admin ; celebrations = préparateur, admin ;
   * announcements = rédacteur, admin ; manage = admin seulement.
   */
  const NEEDS: Record<string, 'view' | 'internal' | 'celebrations' | 'announcements' | 'manage'> = {
    'GET  parishes/:id': 'view',
    'GET  announcements': 'view',
    'GET  activities': 'view',
    'POST announcement': 'announcements',
    'POST activity': 'announcements',
    'DELETE announcement': 'announcements',
    'DELETE activity': 'announcements',
    'PATCH parish (infos publiques)': 'manage',
    'GET  members': 'manage',
  };
  const needOf = (name: string) =>
    NEEDS[name] ?? (name.startsWith('GET') ? 'internal' : 'celebrations');

  const ACTORS = {
    fidèle: { agent: () => faithful, has: ['view'] },
    paroissien: { agent: () => parishioner, has: ['view'] },
    lecteur: { agent: () => reader, has: ['view', 'internal'] },
    préparateur: { agent: () => preparer, has: ['view', 'internal', 'celebrations'] },
    rédacteur: { agent: () => announcer, has: ['view', 'announcements'] },
  } as const;

  for (const [label, actor] of Object.entries(ACTORS)) {
    const allowed = (n: string) => (actor.has as readonly string[]).includes(needOf(n));

    it.each(names.filter((n) => allowed(n) && routes()[n].read))(
      `${label} : peut lire (%s)`,
      async (name) => {
        await routes()[name].call(actor.agent()).expect(200);
      },
    );

    it.each([...names, ...mutNames].filter((n) => !allowed(n)))(
      `${label} : 403 sur %s`,
      async (name) => {
        const call = routes()[name]?.call ?? mutating()[name];
        await call(actor.agent()).expect(403);
      },
    );
  }

  it('un fidèle ne reçoit que les annonces et activités publiques, un paroissien aussi le réservé', async () => {
    const pub = await admin
      .post(`/api/parishes/${a.parishId}/announcements`)
      .send({ title: 'Pour tous', body: 'Texte', visibility: 'PUBLIC' })
      .expect(201);
    const priv = await admin
      .post(`/api/parishes/${a.parishId}/announcements`)
      .send({ title: 'Entre paroissiens', body: 'Texte', visibility: 'MEMBERS' })
      .expect(201);
    const titles = async (agent: Agent) =>
      (await agent.get(`/api/parishes/${a.parishId}/announcements`).expect(200)).body.map(
        (x: { title: string }) => x.title,
      );
    expect(await titles(faithful)).toContain('Pour tous');
    expect(await titles(faithful)).not.toContain('Entre paroissiens');
    expect(await titles(parishioner)).toContain('Entre paroissiens');
    expect(await titles(announcer)).toContain('Entre paroissiens');
    // Le site public, lui, ne l'expose jamais.
    const publicList = await request(app.getHttpServer())
      .get(`/api/public/parishes/${a.parishId}/announcements`)
      .expect(200);
    expect(JSON.stringify(publicList.body)).not.toContain('Entre paroissiens');

    await admin.delete(`/api/parishes/${a.parishId}/announcements/${pub.body.id}`).expect(200);
    await admin.delete(`/api/parishes/${a.parishId}/announcements/${priv.body.id}`).expect(200);
  });

  it('une activité « Paroissiens seulement » est cachée au fidèle et au public', async () => {
    const act = await admin
      .post(`/api/parishes/${a.parishId}/activities`)
      .send({
        title: 'Retraite des paroissiens',
        description: 'Texte',
        startsAt: '2027-05-01T18:00:00.000Z',
        visibility: 'MEMBERS',
      })
      .expect(201);
    const has = async (agent: Agent) =>
      JSON.stringify((await agent.get(`/api/parishes/${a.parishId}/activities`).expect(200)).body);
    expect(await has(faithful)).not.toContain('Retraite des paroissiens');
    expect(await has(parishioner)).toContain('Retraite des paroissiens');
    const publicList = await request(app.getHttpServer())
      .get(`/api/public/parishes/${a.parishId}/activities`)
      .expect(200);
    expect(JSON.stringify(publicList.body)).not.toContain('Retraite des paroissiens');
    await admin.delete(`/api/parishes/${a.parishId}/activities/${act.body.id}`).expect(200);
  });

  it('la gestion des membres reste réservée à l’admin de la paroisse', async () => {
    for (const agent of [faithful, parishioner, reader, preparer, announcer]) {
      await agent.get(`/api/parishes/${a.parishId}/members`).expect(403);
      await agent
        .patch(`/api/parishes/${a.parishId}/members/whoever`)
        .send({ status: 'PARISHIONER' })
        .expect(403);
      await agent.delete(`/api/parishes/${a.parishId}/members/whoever`).expect(403);
    }
  });

  it('PREPARER : ne peut pas modifier l’identité publique de la paroisse (admin seulement)', async () => {
    await preparer.patch(`/api/parishes/${a.parishId}`).send({ address: 'Piraté' }).expect(403);
  });

  it('rédacteur : publie annonces et activités (le préparateur, non : autre responsabilité)', async () => {
    await announcer
      .post(`/api/parishes/${a.parishId}/announcements`)
      .send({ title: 'Par le rédacteur', body: 'Texte' })
      .expect(201);
    await announcer
      .post(`/api/parishes/${a.parishId}/activities`)
      .send({ title: 'Rencontre', description: 'Texte', startsAt: '2027-03-01T18:00:00.000Z' })
      .expect(201);
  });

  it('PREPARER : prépare et publie (contenus, modèles, célébrations)', async () => {
    await preparer
      .post(`/api/parishes/${a.parishId}/contents`)
      .send({ title: 'Par le préparateur', type: 'SONG', body: 'Chant' })
      .expect(201);
    await preparer
      .post(`/api/parishes/${a.parishId}/celebrations`)
      .send({
        templateId: a.templateId,
        title: 'Préparée',
        type: 'SUNDAY_MASS',
        schedule: onDays(40),
      })
      .expect(201);
    await preparer
      .patch(`/api/sheets/${a.sheetId}/steps/${a.celebStepId}`)
      .send({ customText: 'Texte du préparateur' })
      .expect(200);
  });

  it('notes internes : visibles des préparateurs, jamais des lecteurs', async () => {
    const asAdmin = await admin.get(`/api/celebrations/${a.celebrationId}`).expect(200);
    expect(asAdmin.body.internalNote).toBe('Note interne A');
    const asPreparer = await preparer.get(`/api/celebrations/${a.celebrationId}`).expect(200);
    expect(asPreparer.body.internalNote).toBe('Note interne A');

    const asReader = await reader.get(`/api/celebrations/${a.celebrationId}`).expect(200);
    expect(asReader.body).not.toHaveProperty('internalNote');
    expect(JSON.stringify(asReader.body)).not.toContain('Note interne');
    const occurrence = await reader.get(`/api/occurrences/${a.occurrenceId}`).expect(200);
    expect(JSON.stringify(occurrence.body)).not.toContain('Note interne');
  });

  it('une ressource inexistante répond 404 (et non une erreur serveur)', async () => {
    await admin.post('/api/sheets/inexistante/publish').expect(404);
    await admin.get('/api/occurrences/inexistante').expect(404);
    await admin.get('/api/celebrations/inexistante').expect(404);
    await admin.get('/api/contents/inexistant').expect(404);
    await admin.get('/api/templates/inexistant').expect(404);
    await admin.delete('/api/templates/steps/inexistante').expect(404);
  });

  describe('isolation entre paroisses (un admin n’a aucun pouvoir sur l’autre paroisse)', () => {
    it('ne peut ni lire ni modifier les ressources de la paroisse B', async () => {
      await admin.get(`/api/celebrations/${b.celebrationId}`).expect(403);
      await admin
        .patch(`/api/celebrations/${b.celebrationId}`)
        .send({ title: 'Piraté' })
        .expect(403);
      await admin.get(`/api/occurrences/${b.occurrenceId}`).expect(403);
      await admin.post(`/api/occurrences/${b.occurrenceId}/cancel`).send({}).expect(403);
      await admin.get(`/api/sheets/${b.sheetId}`).expect(403);
      await admin.post(`/api/sheets/${b.sheetId}/publish`).expect(403);
      await admin.post(`/api/sheets/${b.sheetId}/steps`).send({ title: 'Piraté' }).expect(403);
      await admin.get(`/api/contents/${b.contentId}`).expect(403);
      await admin.patch(`/api/contents/${b.contentId}`).send({ title: 'Piraté' }).expect(403);
      await admin.delete(`/api/contents/${b.contentId}`).expect(403);
      await admin.get(`/api/templates/${b.templateId}`).expect(403);
      await admin
        .post(`/api/templates/${b.templateId}/steps`)
        .send({ title: 'Piraté', key: 'x', order: 5 })
        .expect(403);
      await admin.delete(`/api/templates/steps/${b.stepId}`).expect(403);
    });

    it('ne peut ni lire, ni publier, ni supprimer les annonces et activités de la paroisse B', async () => {
      await admin.get(`/api/parishes/${b.parishId}/announcements`).expect(403);
      await admin
        .post(`/api/parishes/${b.parishId}/announcements`)
        .send({ title: 'Piraté', body: 'x' })
        .expect(403);
      await admin.get(`/api/parishes/${b.parishId}/activities`).expect(403);
      await admin
        .delete(`/api/parishes/${b.parishId}/announcements/${b.announcementId}`)
        .expect(403);
      await admin.patch(`/api/parishes/${b.parishId}`).send({ address: 'Piraté' }).expect(403);
      await admin
        .patch(`/api/celebrations/${b.celebrationId}`)
        .send({ announced: true })
        .expect(403);
    });

    it('ne peut pas supprimer l’annonce ou l’activité de B en passant par l’URL de sa paroisse', async () => {
      await admin
        .delete(`/api/parishes/${a.parishId}/announcements/${b.announcementId}`)
        .expect(404);
      await admin.delete(`/api/parishes/${a.parishId}/activities/${b.activityId}`).expect(404);
    });

    it('ne peut pas créer une célébration à partir d’un modèle de l’autre paroisse', async () => {
      await admin
        .post(`/api/parishes/${a.parishId}/celebrations`)
        .send({
          templateId: b.templateId,
          title: 'Vol de modèle',
          type: 'SUNDAY_MASS',
          schedule: onDays(25),
        })
        .expect(404);
    });

    it('ne peut pas régler le modèle d’une feuille ou d’une série sur un modèle de l’autre paroisse', async () => {
      await admin
        .patch(`/api/sheets/${a.sheetId}/template`)
        .send({ templateId: b.templateId })
        .expect(404);
      await admin
        .patch(`/api/celebrations/${a.celebrationId}`)
        .send({ defaultTemplateId: b.templateId })
        .expect(404);
    });

    it('ne peut pas viser l’étape d’une autre célébration en passant par la sienne', async () => {
      await admin
        .patch(`/api/sheets/${a.sheetId}/steps/${b.celebStepId}`)
        .send({ customText: 'Piraté' })
        .expect(404);
      await admin.delete(`/api/sheets/${a.sheetId}/steps/${b.celebStepId}`).expect(404);
    });

    it('ne peut pas placer dans une étape un contenu de l’autre paroisse', async () => {
      await admin
        .patch(`/api/sheets/${a.sheetId}/steps/${a.celebStepId}`)
        .send({ contentId: b.contentId })
        .expect(400);
      await admin
        .patch(`/api/sheets/${a.sheetId}/steps/${a.celebStepId}`)
        .send({ contentId: a.contentId })
        .expect(200);
    });
  });

  describe('actions autorisées pour l’admin de la paroisse', () => {
    it('modifie puis supprime un contenu, publie une feuille puis archive la série', async () => {
      await admin.patch(`/api/contents/${a.contentId}`).send({ title: 'Modifié' }).expect(200);
      await admin.post(`/api/sheets/${a.sheetId}/publish`).expect(201);
      await admin.post(`/api/celebrations/${a.celebrationId}/archive`).expect(201);
      // Une étape de modèle déjà utilisée par une célébration ne peut pas être supprimée (409, pas 500).
      await admin.delete(`/api/templates/steps/${a.stepId}`).expect(409);
      const free = await admin
        .post(`/api/templates/${a.templateId}/steps`)
        .send({ title: 'Libre', key: 'libre', order: 5 })
        .expect(201);
      await admin.delete(`/api/templates/steps/${free.body.id}`).expect(200);
      await admin.delete(`/api/contents/${a.contentId}`).expect(200);
    });

    it('complète l’identité publique, annonce une célébration, supprime annonces et activités', async () => {
      const updated = await admin
        .patch(`/api/parishes/${a.parishId}`)
        .send({ address: '1 rue du Test', phone: '' })
        .expect(200);
      expect(updated.body.address).toBe('1 rue du Test');
      await admin
        .patch(`/api/parishes/${a.parishId}`)
        .send({ website: 'javascript:alert(1)' })
        .expect(400);

      const announced = await admin
        .patch(`/api/celebrations/${a.celebrationId}`)
        .send({ announced: true })
        .expect(200);
      expect(announced.body.announced).toBe(true);

      await admin
        .delete(`/api/parishes/${a.parishId}/announcements/${a.announcementId}`)
        .expect(200);
      await admin.delete(`/api/parishes/${a.parishId}/activities/${a.activityId}`).expect(200);
      await admin
        .delete(`/api/parishes/${a.parishId}/announcements/${a.announcementId}`)
        .expect(404);
    });
  });
});
