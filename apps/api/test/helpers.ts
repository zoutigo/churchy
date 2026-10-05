import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { QUEUES } from '@churchy/contracts';
import { AppModule } from '../src/app.module';
import { GoogleTokenVerifier, type GoogleProfile } from '../src/modules/auth/google-token.verifier';
import { configureApp } from '../src/app.setup';

export const PASSWORD = 'password123';

export async function createTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<INestApplication> {
  const moduleRef = await customize(Test.createTestingModule({ imports: [AppModule] })).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

/** Même file et même base Redis (15) que l'application de test : permet d'inspecter les jobs enfilés. */
export function openNotificationsQueue(): Queue {
  return new Queue(QUEUES.NOTIFICATIONS, {
    connection: {
      host: 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6380),
      db: Number(process.env.REDIS_DB ?? 15),
    },
  });
}

export type Agent = ReturnType<typeof request.agent>;

/** Agent HTTP qui conserve les cookies, comme un navigateur. */
export const newAgent = (app: INestApplication): Agent => request.agent(app.getHttpServer());

export async function registerAgent(app: INestApplication, email: string): Promise<Agent> {
  const agent = newAgent(app);
  await agent
    .post('/api/auth/register')
    .send({ email, password: PASSWORD, firstName: 'Jean', lastName: 'Dupont' })
    .expect(201);
  return agent;
}

export function setCookieHeaders(res: request.Response): string[] {
  const header = res.headers['set-cookie'];
  return Array.isArray(header) ? header : header ? [header] : [];
}

/** Valeur brute d'un cookie posé par une réponse. */
export function cookieValue(res: request.Response, name: string): string | undefined {
  const line = setCookieHeaders(res).find((c) => c.startsWith(`${name}=`));
  return line?.split(';')[0].slice(name.length + 1);
}

/** Dernier job d'un type donné pour un email, dans la file de notifications. */
export async function findJobFor(queue: Queue, jobName: string, email: string) {
  const jobs = await queue.getJobs(['waiting', 'delayed', 'active', 'completed', 'failed']);
  return jobs
    .filter((j) => j.name === jobName && j.data.email === email)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
}

export const tokenFromUrl = (url: string): string =>
  new URL(url).searchParams.get('token') as string;

/** Jour « AAAA-MM-JJ » situé dans `days` jours (UTC) : les tests ne doivent pas dépendre du jour de lancement. */
export const dayFromNow = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/** Planning de dates ponctuelles, à 10 h locale. */
export const onDays = (...days: number[]) => ({
  kind: 'dates' as const,
  dates: days.map((d) => ({ date: dayFromNow(d), time: '10:00' })),
});

/**
 * Faux vérificateur Google : le « jeton » est le profil en JSON (ou « invalid »). Les tests n'appellent jamais
 * Google, mais passent par tout le reste du flux réel (base, cookies, journal).
 */
export class FakeGoogleVerifier extends GoogleTokenVerifier {
  constructor(private configured = true) {
    super();
  }
  isConfigured() {
    return this.configured;
  }
  async verify(idToken: string): Promise<GoogleProfile> {
    if (idToken === 'invalid') throw new UnauthorizedException('googleTokenInvalid');
    return JSON.parse(idToken) as GoogleProfile;
  }
}

export const googleToken = (profile: Partial<GoogleProfile> & { sub: string; email: string }) =>
  JSON.stringify({ emailVerified: true, firstName: 'Jean', lastName: 'Dupont', ...profile });

/** Ouvre une session par téléphone et renvoie l'agent (qui garde les cookies). */
export async function registerPhoneAgent(
  app: INestApplication,
  phone: string,
  pin = '482915',
  extra: Record<string, unknown> = {},
): Promise<Agent> {
  const agent = newAgent(app);
  await agent
    .post('/api/auth/register/phone')
    .send({ phone, pin, firstName: 'Jean', lastName: 'Dupont', ...extra })
    .expect(201);
  return agent;
}
