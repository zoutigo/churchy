import { INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('Limitation du nombre de tentatives', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // La limite est lue à l'import de la configuration : on l'abaisse avant de charger l'application.
    process.env.AUTH_THROTTLE_LIMIT = '3';
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

  it('ne limite pas les routes ordinaires au même seuil', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer()).get('/api/health').expect(200);
    }
  });
});
