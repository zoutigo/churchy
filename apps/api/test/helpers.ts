import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { QUEUES } from '@churchy/contracts';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

export const PASSWORD = 'password123';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
