import { expect, test, type Browser } from '@playwright/test';
import {
  VIEWPORTS,
  hasHorizontalOverflow,
  registerViaUi,
  seedParish,
  uniqueEmail,
} from './helpers';

const API = 'http://localhost:3211/api';

/** Un administrateur (créateur de la paroisse) et une autre personne, dans deux contextes séparés. */
async function setup(browser: Browser, viewport: { width: number; height: number }, tag: string) {
  const ownerContext = await browser.newContext({ viewport });
  const owner = await ownerContext.newPage();
  await registerViaUi(owner, uniqueEmail(`ro-owner-${tag}`));
  const parish = await seedParish(owner);
  const announce = await owner.request.post(`${API}/parishes/${parish.id}/announcements`, {
    data: { title: 'Réunion des paroissiens', body: 'Ordre du jour', visibility: 'MEMBERS' },
  });
  expect(announce.ok()).toBe(true);

  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await registerViaUi(page, uniqueEmail(`ro-faithful-${tag}`), 'Anne');
  const me = await (await page.request.get(`${API}/auth/me`)).json();
  return { owner, ownerContext, parish, page, context, userId: me.id as string };
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test(`fidèle puis paroissien : vue en lecture seule dans le tableau de bord (${device})`, async ({
    browser,
  }) => {
    const { owner, ownerContext, parish, page, context, userId } = await setup(
      browser,
      viewport,
      device,
    );

    // « Mes paroisses » est vide, puis la paroisse apparaît avec le statut dès qu'on la suit.
    await page.goto('/dashboard/parishes');
    await expect(page.getByText('Aucune paroisse pour l’instant.')).toBeVisible();
    expect((await page.request.post(`${API}/parishes/${parish.id}/follow`)).ok()).toBe(true);
    await page.reload();
    const card = page.getByRole('link', { name: new RegExp(parish.name) });
    await expect(card).toContainText('Fidèle');
    expect(await hasHorizontalOverflow(page)).toBe(false);

    // Vue d'une paroisse : lecture seule (annonces et activités, ni gestion ni modification).
    await card.click();
    await expect(page.getByRole('heading', { level: 1, name: parish.name })).toBeVisible();
    await expect(page.getByText(/réservée à ses administrateurs/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Modifier' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Annonces/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Bibliothèque/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Célébrations/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ne plus suivre' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter aux favoris' })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    // Fidèle : l'annonce « Paroissiens seulement » est cachée, et on ne peut rien écrire.
    await page.getByRole('link', { name: /Annonces/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Annonces' })).toBeVisible();
    await expect(page.getByText('Changement d’horaire')).toBeVisible();
    await expect(page.getByText('Réunion des paroissiens')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Nouvelle annonce' })).toHaveCount(0);

    // L'administrateur le promeut : il voit désormais l'annonce, toujours sans écrire.
    const promote = await owner.request.patch(`${API}/parishes/${parish.id}/members/${userId}`, {
      data: { status: 'PARISHIONER' },
    });
    expect(promote.ok()).toBe(true);
    await page.reload();
    await expect(page.getByText('Réunion des paroissiens')).toBeVisible();
    await expect(page.getByText('Paroissiens seulement')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Nouvelle annonce' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Supprimer/ })).toHaveCount(0);
    expect(await hasHorizontalOverflow(page)).toBe(false);

    // Un paroissien n'a toujours pas accès aux données internes (l'API refuse).
    expect((await page.request.get(`${API}/parishes/${parish.id}/celebrations`)).status()).toBe(
      403,
    );

    await context.close();
    await ownerContext.close();
  });
}

test('administrateur : gestion complète et lien vers le site public', async ({ page }) => {
  await registerViaUi(page, uniqueEmail('ro-admin'));
  const parish = await seedParish(page);
  await page.goto(`/dashboard/parishes/${parish.id}`);
  await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();
  await expect(page.getByText(/réservée à ses administrateurs/)).toHaveCount(0);
  for (const name of [/Bibliothèque/, /Modèles/, /Célébrations/, /Annonces/, /Activités/]) {
    await expect(page.getByRole('link', { name })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: /Voir la page publique/ })).toBeVisible();
});

test('en anglais : bandeau de lecture seule', async ({ browser }) => {
  const { ownerContext, parish, page, context } = await setup(browser, VIEWPORTS.desktop, 'en');
  await page.request.patch(`${API}/auth/me/locale`, { data: { locale: 'en' } });
  await page.request.post(`${API}/parishes/${parish.id}/follow`);
  await page.goto(`/dashboard/parishes/${parish.id}`);
  await expect(page.getByText(/reserved for its administrators/)).toBeVisible();
  await context.close();
  await ownerContext.close();
});
