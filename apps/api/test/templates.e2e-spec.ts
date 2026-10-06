import { INestApplication } from '@nestjs/common';
import { createTestApp, registerAgent } from './helpers';

describe('Modèles de feuille — modification et suppression (vraie base churchy_test)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  async function setup(email: string) {
    const agent = await registerAgent(app, email);
    const parish = await agent
      .post('/api/parishes')
      .send({ name: 'Saint Paul', city: 'Lyon', country: 'France' })
      .expect(201);
    const tpl = await agent
      .post(`/api/parishes/${parish.body.id}/templates`)
      .send({ name: 'Messe', type: 'SUNDAY_MASS' })
      .expect(201);
    const steps: { id: string; key: string }[] = [];
    for (const [i, title] of ['Entrée', 'Psaume', 'Sortie'].entries()) {
      const s = await agent
        .post(`/api/templates/${tpl.body.id}/steps`)
        .send({ title, key: title.toLowerCase(), order: i + 1 })
        .expect(201);
      steps.push(s.body);
    }
    return { agent, parishId: parish.body.id as string, templateId: tpl.body.id as string, steps };
  }

  it('modifie nom, type et description sans toucher aux étapes', async () => {
    const { agent, templateId } = await setup('tpl-rename@test.fr');
    const res = await agent
      .patch(`/api/templates/${templateId}`)
      .send({ name: 'Messe solennelle', type: 'WEDDING', description: 'Grandes fêtes' })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Messe solennelle', type: 'WEDDING' });
    expect(res.body.steps.map((s: { title: string }) => s.title)).toEqual([
      'Entrée',
      'Psaume',
      'Sortie',
    ]);
  });

  it('remplace la liste : renomme, réordonne, ajoute et retire, en gardant les clés existantes', async () => {
    const { agent, templateId, steps } = await setup('tpl-steps@test.fr');
    const res = await agent
      .patch(`/api/templates/${templateId}`)
      .send({
        steps: [
          { id: steps[2].id, title: 'Chant de sortie' },
          { title: 'Offertoire' },
          { id: steps[0].id, title: 'Entrée' },
        ],
      })
      .expect(200);
    expect(res.body.steps.map((s: { title: string; order: number }) => [s.order, s.title])).toEqual(
      [
        [1, 'Chant de sortie'],
        [2, 'Offertoire'],
        [3, 'Entrée'],
      ],
    );
    const byTitle = Object.fromEntries(
      res.body.steps.map((s: { title: string; key: string }) => [s.title, s.key]),
    );
    expect(byTitle['Chant de sortie']).toBe('sortie'); // clé conservée malgré le nouveau titre
    expect(byTitle['Offertoire']).toBe('offertoire');
    expect(res.body.steps.find((s: { id: string }) => s.id === steps[1].id)).toBeUndefined();
  });

  it('une feuille déjà créée garde ses étapes quand on retire celle du modèle', async () => {
    const { agent, parishId, templateId, steps } = await setup('tpl-keep@test.fr');
    const start = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const series = await agent
      .post(`/api/parishes/${parishId}/celebrations`)
      .send({
        title: 'Messe',
        type: 'SUNDAY_MASS',
        templateId,
        schedule: { kind: 'dates', dates: [{ date: start, time: '10:00' }] },
      })
      .expect(201);
    const detail = await agent.get(`/api/celebrations/${series.body.id}`).expect(200);
    const occurrenceId = detail.body.occurrences[0].id;
    const sheet = await agent.post(`/api/occurrences/${occurrenceId}/sheet`).send({}).expect(201);
    expect(sheet.body.steps).toHaveLength(3);

    await agent
      .patch(`/api/templates/${templateId}`)
      .send({ steps: [{ id: steps[0].id, title: 'Entrée' }] })
      .expect(200);

    const after = await agent.get(`/api/sheets/${sheet.body.id}`).expect(200);
    expect(after.body.steps).toHaveLength(3);

    // Supprimer le modèle détache la feuille et la série, sans rien perdre.
    await agent.delete(`/api/templates/${templateId}`).expect(204);
    const sheetAfter = await agent.get(`/api/sheets/${sheet.body.id}`).expect(200);
    expect(sheetAfter.body.templateId).toBeNull();
    expect(sheetAfter.body.steps).toHaveLength(3);
    await agent.get(`/api/templates/${templateId}`).expect(404);
  });

  it('valide les données : nom vide, liste vide, étape inconnue', async () => {
    const { agent, templateId } = await setup('tpl-invalid@test.fr');
    await agent.patch(`/api/templates/${templateId}`).send({ name: '  ' }).expect(400);
    await agent.patch(`/api/templates/${templateId}`).send({ steps: [] }).expect(400);
    await agent
      .patch(`/api/templates/${templateId}`)
      .send({ steps: [{ id: 'inconnue', title: 'X' }] })
      .expect(400);
    await agent.patch('/api/templates/inexistant').send({ name: 'A' }).expect(404);
  });

  it('isole les paroisses : un autre compte ne peut ni modifier ni supprimer', async () => {
    const { templateId } = await setup('tpl-owner@test.fr');
    const intruder = await registerAgent(app, 'tpl-intruder@test.fr');
    await intruder.patch(`/api/templates/${templateId}`).send({ name: 'Piraté' }).expect(403);
    await intruder.delete(`/api/templates/${templateId}`).expect(403);
  });

  it('un lecteur (responsabilité Lecteur) ne peut pas modifier un modèle', async () => {
    const { agent, parishId, templateId } = await setup('tpl-admin@test.fr');
    const reader = await registerAgent(app, 'tpl-reader@test.fr');
    const me = await reader.get('/api/auth/me').expect(200);
    await reader.post(`/api/parishes/${parishId}/follow`).expect(201);
    await agent
      .patch(`/api/parishes/${parishId}/members/${me.body.id}`)
      .send({ status: 'PARISHIONER', duties: ['READER'] })
      .expect(200);
    await reader.get(`/api/parishes/${parishId}/templates`).expect(200);
    await reader.patch(`/api/templates/${templateId}`).send({ name: 'Non' }).expect(403);
    await reader.delete(`/api/templates/${templateId}`).expect(403);
  });
});
