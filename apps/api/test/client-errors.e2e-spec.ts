import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('Erreurs du navigateur (public)', () => {
  let app: INestApplication;
  const post = (body: object) => request(app.getHttpServer()).post('/api/client-errors').send(body);

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(() => app.close());

  it('accepte un rapport sans authentification', async () => {
    const res = await post({ message: 'boom', source: 'global', path: '/fr' }).expect(202);
    expect(res.body).toEqual({ received: true });
  });

  it('rejette un rapport invalide ou trop gros (400)', async () => {
    await post({ message: 'boom', source: 'autre' }).expect(400);
    await post({ message: 'x'.repeat(501), source: 'global' }).expect(400);
    await post({ source: 'global' }).expect(400);
  });
});
