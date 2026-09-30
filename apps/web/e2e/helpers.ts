import { expect, type Page } from '@playwright/test';
import { Queue } from 'bullmq';

export const PASSWORD = 'password123';

export const uniqueEmail = (prefix = 'user') =>
  `${prefix}-${Date.now()}${Math.floor(Math.random() * 1000)}@e2e.test`;

/** Mêmes file et base Redis (15) que l'API lancée par Playwright : on y lit les emails « envoyés ». */
async function withQueue<T>(fn: (queue: Queue) => Promise<T>): Promise<T> {
  const queue = new Queue('notifications', {
    connection: { host: 'localhost', port: Number(process.env.REDIS_PORT ?? 6380), db: 15 },
  });
  try {
    return await fn(queue);
  } finally {
    await queue.close();
  }
}

type AuthEmailJob = 'auth.email-verification-requested' | 'auth.password-reset-requested';

/** Lien contenu dans le dernier email de ce type envoyé à cette adresse. */
export async function latestEmailLink(email: string, jobName: AuthEmailJob): Promise<string> {
  return withQueue(async (queue) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const jobs = await queue.getJobs(['waiting', 'delayed', 'active', 'completed', 'failed']);
      const job = jobs
        .filter((j) => j.name === jobName && j.data.email === email)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (job) return job.data.url as string;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Aucun email ${jobName} pour ${email}`);
  });
}

export async function registerViaUi(page: Page, email: string, firstName = 'Jean') {
  await page.goto('/register');
  await page.getByLabel('Prénom').fill(firstName);
  await page.getByLabel('Nom', { exact: true }).fill('Dupont');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function loginViaUi(page: Page, email: string, password = PASSWORD, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

export async function logoutViaUi(page: Page) {
  await page.getByRole('button', { name: 'Menu utilisateur' }).click();
  await page.getByRole('menuitem', { name: /Se déconnecter/ }).click();
  await expect(page).toHaveURL(/\/login$/);
}
