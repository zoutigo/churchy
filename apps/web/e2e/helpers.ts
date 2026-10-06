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

type AuthEmailJob =
  | 'auth.email-verification-requested'
  | 'auth.password-reset-requested'
  | 'auth.pin-reset-requested';

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
  await page.goto('/fr/inscription');
  await page.getByLabel('Prénom').fill(firstName);
  await page.getByLabel('Nom', { exact: true }).fill('Dupont');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function loginViaUi(page: Page, email: string, password = PASSWORD, next?: string) {
  await page.goto(next ? `/fr/connexion?next=${encodeURIComponent(next)}` : '/fr/connexion');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
}

export async function logoutViaUi(page: Page) {
  await page.getByRole('button', { name: 'Menu utilisateur' }).click();
  await page.getByRole('menuitem', { name: /Se déconnecter/ }).click();
  await expect(page).toHaveURL(/\/fr\/connexion$/);
}

export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1366, height: 800 },
} as const;

const API_URL = 'http://localhost:3211/api';
const inDays = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
/** Jour « AAAA-MM-JJ » dans `days` jours (UTC). */
export const dayFromNow = (days: number) => inDays(days).slice(0, 10);

export interface SeededParish {
  id: string;
  /** Mot unique présent dans le nom : permet de retrouver CETTE paroisse par la recherche. */
  token: string;
  name: string;
  publishedId: string;
  announcedId: string;
}

/**
 * Prépare une paroisse publique complète (identité, messe publiée, messe annoncée, brouillon caché,
 * annonce, activité) via l'API, avec la session du navigateur (l'utilisateur doit être connecté).
 */
export async function seedParish(page: Page): Promise<SeededParish> {
  const token = `Zq${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const name = `Saint ${token}`;
  const post = async (path: string, data: object) => {
    const res = await page.request.post(`${API_URL}${path}`, { data });
    expect(res.ok(), `${path} → ${res.status()}`).toBe(true);
    return res.json();
  };

  const parish = await post('/parishes', {
    name,
    city: 'Lyon',
    country: 'France',
    district: 'Croix-Rousse',
    mainChurch: 'Église Saint-Pierre',
    address: '1 place de l’Église',
    phone: '04 00 00 00 00',
    email: 'contact@paroisse-e2e.fr',
    description: 'Une paroisse accueillante.',
  });
  const template = await post(`/parishes/${parish.id}/templates`, {
    name: 'Messe dominicale',
    type: 'SUNDAY_MASS',
  });
  await post(`/templates/${template.id}/steps`, {
    title: 'Première lecture',
    key: 'reading-1',
    order: 1,
  });
  /** Série d'une date ; renvoie l'identifiant de la date (c'est lui que le public utilise dans l'URL). */
  const celebrate = async (title: string, days: number, extra: object = {}) =>
    (
      await post(`/parishes/${parish.id}/celebrations`, {
        templateId: template.id,
        title,
        type: 'SUNDAY_MASS',
        location: 'Église Saint-Pierre',
        schedule: { kind: 'dates', dates: [{ date: dayFromNow(days), time: '10:00' }] },
        ...extra,
      })
    ).occurrences[0].id as string;

  await celebrate('Messe brouillon cachée', 2);
  const announcedId = await celebrate('Messe annoncée', 3, { announced: true });
  const publishedId = await celebrate('Messe publiée', 4, { announced: true });
  const sheet = await post(`/occurrences/${publishedId}/sheet`, {});
  await post(`/sheets/${sheet.id}/publish`, {});

  await post(`/parishes/${parish.id}/announcements`, {
    title: 'Changement d’horaire',
    summary: 'La messe du dimanche est avancée',
    body: 'Dès dimanche prochain, la messe commence à 9 h.',
  });
  await post(`/parishes/${parish.id}/activities`, {
    title: 'Groupe de jeunes',
    description: 'Rencontre mensuelle des jeunes.',
    startsAt: inDays(10),
    location: 'Salle paroissiale',
  });
  return { id: parish.id, token, name, publishedId, announcedId };
}

/** Dernier message de contact enfilé pour cette adresse (la file Redis tient lieu de boîte mail). */
export async function latestContactJob(email: string) {
  return withQueue(async (queue) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const jobs = await queue.getJobs(['waiting', 'delayed', 'active', 'completed', 'failed']);
      const job = jobs
        .filter((j) => j.name === 'contact.message-received' && j.data.email === email)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (job) return job.data as Record<string, string>;
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  });
}

/** Vrai si la page déborde horizontalement (le défilement horizontal est un défaut sur mobile). */
export const hasHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

/** Numéro camerounais unique : « national » à saisir dans le champ, « e164 » tel que stocké par l'API. */
export function uniquePhone() {
  const digits = `6${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
  return { national: digits, e164: `+237${digits}` };
}

export const PIN = '482915';

/** Inscription par téléphone via l'interface (onglet « Téléphone » de /inscription). */
export async function registerPhoneViaUi(
  page: Page,
  phone = uniquePhone(),
  { firstName = 'Marie', pin = PIN }: { firstName?: string; pin?: string } = {},
) {
  await page.goto('/fr/inscription');
  await page.getByRole('tab', { name: 'Téléphone' }).click();
  await page.getByLabel('Prénom').fill(firstName);
  await page.getByLabel('Nom', { exact: true }).fill('Ngono');
  await page.getByLabel('Numéro de téléphone').fill(phone.national);
  await page.getByLabel('PIN', { exact: true }).fill(pin);
  await page.getByLabel('Confirmer le PIN').fill(pin);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return phone;
}

/** Connexion par téléphone via l'interface. */
export async function loginPhoneViaUi(
  page: Page,
  phone: { national: string },
  pin = PIN,
  next?: string,
) {
  await page.goto(next ? `/fr/connexion?next=${encodeURIComponent(next)}` : '/fr/connexion');
  await page.getByRole('tab', { name: 'Téléphone' }).click();
  await page.getByLabel('Numéro de téléphone').fill(phone.national);
  await page.getByLabel('PIN', { exact: true }).fill(pin);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

/** Donne un rôle de plateforme à un compte (aucune route d'API ne crée un SUPER_ADMIN, volontairement). */
export async function setPlatformRole(
  email: string,
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER',
) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({
    datasourceUrl:
      process.env.TEST_DATABASE_URL ??
      'postgresql://postgres:password@localhost:5433/churchy_test?schema=public',
  });
  try {
    await prisma.user.update({ where: { email }, data: { role } });
  } finally {
    await prisma.$disconnect();
  }
}

/** Passe un compte en super administrateur de la plateforme. */
export const makeSuperAdmin = (email: string) => setPlatformRole(email, 'SUPER_ADMIN');

/** Largeur de page : aucun défilement horizontal ne doit apparaître (mobile surtout). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}
