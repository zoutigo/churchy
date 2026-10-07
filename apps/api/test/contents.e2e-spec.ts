import { INestApplication } from '@nestjs/common';
import { createTestApp, newAgent, registerAgent, type Agent } from './helpers';

describe('Contenus de la bibliothèque : lecture, modification, suppression, erreurs', () => {
  let app: INestApplication;
  let author: Agent;
  let other: Agent;
  let parishId: string;
  const stamp = Date.now();

  const create = (body: object = {}) =>
    author
      .post(`/api/parishes/${parishId}/contents`)
      .send({ title: 'Notre Père', type: 'PRAYER', body: '<p>Notre Père</p>', ...body });

  beforeAll(async () => {
    app = await createTestApp();
    author = await registerAgent(app, `contents-author-${stamp}@e2e.test`);
    other = await registerAgent(app, `contents-other-${stamp}@e2e.test`);
    const parish = await author
      .post('/api/parishes')
      .send({ name: `Paroisse contenus ${stamp}`, city: 'Lyon', country: 'France' })
      .expect(201);
    parishId = parish.body.id;
  });

  afterAll(() => app.close());

  describe('format des erreurs de validation (consommé par le web)', () => {
    it('400 : message = erreurs Zod aplaties, champ par champ', async () => {
      const res = await create({ title: '', body: '' }).expect(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message.fieldErrors.title).toEqual(['titleRequired']);
      expect(res.body.message.fieldErrors.body).toEqual(['contentRequired']);
    });

    it('type inconnu : erreur sur le champ type uniquement', async () => {
      const res = await create({ type: 'INCONNU' }).expect(400);
      expect(Object.keys(res.body.message.fieldErrors)).toEqual(['type']);
    });

    it('modification avec un titre vide : 400 sur title', async () => {
      const c = (await create().expect(201)).body;
      const res = await author.patch(`/api/contents/${c.id}`).send({ title: '' }).expect(400);
      expect(res.body.message.fieldErrors.title).toEqual(['titleRequired']);
    });

    it('401 sans session, 404 pour un contenu inconnu', async () => {
      await newAgent(app).get('/api/contents/x').expect(401);
      const res = await author.get('/api/contents/inexistant').expect(404);
      expect(res.body.message.message).toBe('resourceNotFound');
    });
  });

  describe('lecture', () => {
    it('la liste et le détail exposent l’auteur (affiché par l’interface)', async () => {
      const c = (await create({ title: 'Lecture auteur' }).expect(201)).body;
      const list = await author.get(`/api/parishes/${parishId}/contents`).expect(200);
      const found = list.body.find((x: { id: string }) => x.id === c.id);
      expect(found.createdBy).toMatchObject({ id: c.createdById, firstName: 'Jean' });
      const one = await author.get(`/api/contents/${c.id}`).expect(200);
      expect(one.body.createdBy.lastName).toBe('Dupont');
    });

    it('un utilisateur étranger à la paroisse ne lit rien (403)', async () => {
      const c = (await create().expect(201)).body;
      await other.get(`/api/contents/${c.id}`).expect(403);
      await other.get(`/api/parishes/${parishId}/contents`).expect(403);
    });
  });

  describe('modification et suppression', () => {
    it('l’auteur modifie : titre, type et texte (nettoyé) changent', async () => {
      const c = (await create().expect(201)).body;
      const res = await author
        .patch(`/api/contents/${c.id}`)
        .send({ title: 'Titre modifié', type: 'SONG', body: '<p>ok</p><script>alert(1)</script>' })
        .expect(200);
      expect(res.body).toMatchObject({ title: 'Titre modifié', type: 'SONG' });
      expect(res.body.body).toBe('<p>ok</p>');
      const again = await author.get(`/api/contents/${c.id}`).expect(200);
      expect(again.body.title).toBe('Titre modifié');
    });

    it('modification partielle : les autres champs sont conservés', async () => {
      const c = (await create({ title: 'Garde-moi' }).expect(201)).body;
      await author.patch(`/api/contents/${c.id}`).send({ type: 'PSALM' }).expect(200);
      const again = (await author.get(`/api/contents/${c.id}`).expect(200)).body;
      expect(again).toMatchObject({ title: 'Garde-moi', type: 'PSALM', body: '<p>Notre Père</p>' });
    });

    it('l’auteur supprime : réponse vide, puis 404', async () => {
      const c = (await create().expect(201)).body;
      const res = await author.delete(`/api/contents/${c.id}`).expect(200);
      expect(res.text).toBe('');
      await author.get(`/api/contents/${c.id}`).expect(404);
    });

    it('un autre membre de la paroisse ne peut ni modifier ni supprimer (403, message clair)', async () => {
      const c = (await create().expect(201)).body;
      // `other` est rendu administrateur de la paroisse : le garde passe, la règle « auteur » s’applique.
      const me = await other.get('/api/auth/me').expect(200);
      await other.post(`/api/parishes/${parishId}/follow`).expect(201);
      await author
        .patch(`/api/parishes/${parishId}/members/${me.body.id}`)
        .send({ status: 'PARISH_ADMIN' })
        .expect(200);
      const patch = await other
        .patch(`/api/contents/${c.id}`)
        .send({ title: 'Piraté' })
        .expect(403);
      expect(patch.body.message.message).toBe('creatorOnlyEdit');
      const del = await other.delete(`/api/contents/${c.id}`).expect(403);
      expect(del.body.message.message).toBe('creatorOnlyDelete');
      expect((await author.get(`/api/contents/${c.id}`).expect(200)).body.title).toBe('Notre Père');
    });
  });
});
