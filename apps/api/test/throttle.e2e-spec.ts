import { INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('Limitation du nombre de tentatives', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // La limite est lue à l'import de la configuration : on l'abaisse avant de charger l'application.
    process.env.AUTH_THROTTLE_LIMIT = '3';
    process.env.TRUST_PROXY_HOPS = '1'; // comme en production, derrière nginx
    const { createTestApp } = await import('./helpers');
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloque (429) la force brute sur /auth/login après 3 tentatives par minute', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'inconnu@test.fr', password: 'mauvais-mdp' });

    for (let i = 0; i < 3; i++) await attempt().expect(401);
    const blocked = await attempt().expect(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('derrière un proxy, limite par IP cliente (X-Forwarded-For), pas par IP du proxy', async () => {
    const attempt = (ip: string) =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'inconnu@test.fr', password: 'mauvais-mdp' });

    for (let i = 0; i < 3; i++) await attempt('203.0.113.10').expect(401);
    await attempt('203.0.113.10').expect(429);
    // Un autre visiteur, derrière le même proxy, n'est pas bloqué.
    await attempt('203.0.113.11').expect(401);
  });

  it('limite aussi le formulaire de contact public (anti-spam)', async () => {
    const send = () =>
      request(app.getHttpServer()).post('/api/contact').send({
        name: 'Marie',
        email: 'marie@exemple.fr',
        topic: 'QUESTION',
        message: 'Un message assez long.',
        website: 'robot',
      });
    for (let i = 0; i < 3; i++) await send().expect(202);
    await send().expect(429);
  });

  it('ne limite pas les routes ordinaires au même seuil', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer()).get('/api/health').expect(200);
    }
  });
});
