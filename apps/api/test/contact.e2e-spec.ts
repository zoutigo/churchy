import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { createTestApp, openNotificationsQueue } from './helpers';

describe('Contact (public)', () => {
  let app: INestApplication;
  let queue: Queue;
  const post = (body: object) => request(app.getHttpServer()).post('/api/contact').send(body);
  const jobs = async () =>
    (await queue.getJobs(['waiting', 'delayed', 'active', 'completed', 'failed'])).filter(
      (j) => j.name === 'contact.message-received',
    );
  const valid = {
    name: 'Marie Dupont',
    email: 'Marie@Exemple.fr',
    topic: 'PARISH',
    message: 'Nous aimerions utiliser Churchy dans notre paroisse.',
  };

  beforeAll(async () => {
    app = await createTestApp();
    queue = openNotificationsQueue();
  });

  beforeEach(() => queue.obliterate({ force: true }));

  afterAll(async () => {
    await queue.obliterate({ force: true });
    await queue.close();
    await app.close();
  });

  it('accepte un message sans authentification et l’enfile pour le worker', async () => {
    const res = await post(valid).expect(202);
    expect(res.body).toEqual({ sent: true });

    const [job] = await jobs();
    expect(job.data).toMatchObject({
      name: 'Marie Dupont',
      email: 'marie@exemple.fr',
      topic: 'PARISH',
      message: valid.message,
    });
    expect(job.data.receivedAt).toBeDefined();
  });

  it('rejette un message invalide (400) sans rien enfiler', async () => {
    await post({ ...valid, email: 'nope' }).expect(400);
    await post({ ...valid, message: 'court' }).expect(400);
    await post({ ...valid, topic: 'SPAM' }).expect(400);
    await post({ ...valid, name: '' }).expect(400);
    expect(await jobs()).toHaveLength(0);
  });

  it('piège à robots : champ masqué rempli → 202 mais aucun email', async () => {
    await post({ ...valid, website: 'http://spam.example' }).expect(202);
    expect(await jobs()).toHaveLength(0);
  });
});
