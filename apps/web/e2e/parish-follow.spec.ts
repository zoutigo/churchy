import { expect, test, type Page } from '@playwright/test';
import {
  VIEWPORTS,
  hasHorizontalOverflow,
  loginViaUi,
  registerViaUi,
  seedParish,
  uniqueEmail,
  type SeededParish,
} from './helpers';

const API = 'http://localhost:3211/api';
const toast = (page: Page, text: string) =>
  page.locator('ol > li[data-state="open"]').filter({ hasText: text }).first();

test.describe('devenir fidèle d’une paroisse', () => {
  let parish: SeededParish;
  let ownerEmail: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    ownerEmail = uniqueEmail('follow-owner');
    await registerViaUi(page, ownerEmail);
    parish = await seedParish(page);
    await page.close();
  });

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${device} (${viewport.width}×${viewport.height})`, () => {
      test.use({ viewport });

      test('visiteur → connexion → retour sur la paroisse → confirmation → fidèle → quitter', async ({
        page,
      }) => {
        const email = uniqueEmail(`follow-${device}`);
        // Le compte existe avant la visite (inscription dans un autre onglet).
        const setup = await page.context().newPage();
        await registerViaUi(setup, email, 'Anne');
        await setup.request.post(`${API}/auth/logout`);
        await setup.context().clearCookies();
        await setup.close();

        await page.goto(`/fr/paroisses/${parish.id}`);
        await page.getByRole('link', { name: /Devenir fidèle/ }).click();
        await expect(page).toHaveURL(/\/fr\/connexion\?next=/);
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Mot de passe', { exact: true }).fill('password123');
        await page.getByRole('button', { name: 'Se connecter', exact: true }).click();

        // Retour sur la paroisse, sans validation requise.
        await expect(page).toHaveURL(new RegExp(`/fr/paroisses/${parish.id}$`));
        await page.getByRole('button', { name: /Devenir fidèle/ }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText('Anne Dupont');
        await expect(dialog).toContainText('ni votre email ni votre téléphone');
        await dialog.getByRole('link', { name: 'politique de confidentialité' }).waitFor();
        await dialog.getByRole('button', { name: 'Confirmer' }).click();

        await expect(toast(page, `Vous êtes fidèle de ${parish.name}`)).toBeVisible();
        await expect(page.getByText('Vous êtes fidèle', { exact: true })).toBeVisible();
        expect(await hasHorizontalOverflow(page)).toBe(false);

        // Le statut survit au rechargement (il est en base, pas dans le navigateur).
        await page.reload();
        await expect(page.getByText('Vous êtes fidèle', { exact: true })).toBeVisible();

        // Un fidèle n'a aucun accès interne.
        const internal = await page.request.get(`${API}/parishes/${parish.id}/celebrations`);
        expect(internal.status()).toBe(403);

        await page.getByRole('button', { name: 'Ne plus suivre' }).click();
        await expect(toast(page, `Vous ne suivez plus ${parish.name}`)).toBeVisible();
        await expect(page.getByRole('button', { name: /Devenir fidèle/ })).toBeVisible();
      });
    });
  }

  test('promu paroissien par l’administrateur : peut se retirer, redevient fidèle', async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail('follow-promoted');
    await registerViaUi(page, email, 'Paul');
    await page.goto(`/fr/paroisses/${parish.id}`);
    await page.getByRole('button', { name: /Devenir fidèle/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
    await expect(page.getByText('Vous êtes fidèle', { exact: true })).toBeVisible();

    // L'administrateur le promeut (immédiat, sans invitation).
    const ownerContext = await browser.newContext();
    const owner = await ownerContext.newPage();
    await loginViaUi(owner, ownerEmail);
    await expect(owner).toHaveURL(/\/dashboard$/);
    const me = await (await page.request.get(`${API}/auth/me`)).json();
    const promote = await owner.request.patch(`${API}/parishes/${parish.id}/members/${me.id}`, {
      data: { status: 'PARISHIONER', duties: ['READER'] },
    });
    expect(promote.ok()).toBe(true);
    await ownerContext.close();

    await page.reload();
    await expect(page.getByText('Vous êtes paroissien', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Me retirer (redevenir fidèle)' }).click();
    await expect(toast(page, `Vous êtes de nouveau fidèle de ${parish.name}`)).toBeVisible();
    await expect(page.getByText('Vous êtes fidèle', { exact: true })).toBeVisible();
  });

  test('en anglais : « Become a follower »', async ({ page }) => {
    await page.goto(`/en/parishes/${parish.id}`);
    await expect(page.getByRole('link', { name: /Become a follower/ })).toBeVisible();
  });
});

test.describe('annonces et activités « Paroissiens seulement »', () => {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`le choix de visibilité est proposé et respecté (${device})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await registerViaUi(page, uniqueEmail(`vis-${device}`));
      const parish = await seedParish(page);

      await page.goto(`/dashboard/parishes/${parish.id}/announcements`);
      await page.getByRole('button', { name: '+ Nouvelle annonce' }).click();
      await expect(page.getByRole('radio', { name: /Tout le monde/ })).toBeChecked();
      await page.getByLabel('Titre').fill('Réunion des paroissiens');
      await page.getByRole('textbox', { name: 'Contenu' }).fill('Ordre du jour');
      await page.getByRole('radio', { name: /Paroissiens seulement/ }).check();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.getByRole('button', { name: 'Publier l’annonce' }).click();
      await expect(toast(page, 'Annonce publiée')).toBeVisible();

      // Dans la liste de gestion : repérée par une pastille.
      const item = page.getByRole('listitem').filter({ hasText: 'Réunion des paroissiens' });
      await expect(item).toContainText('Paroissiens seulement');

      // Sur le site public, elle n'apparaît jamais ; l'annonce publique, oui.
      await page.goto(`/fr/paroisses/${parish.id}/annonces`);
      await expect(page.getByText('Changement d’horaire')).toBeVisible();
      await expect(page.getByText('Réunion des paroissiens')).toHaveCount(0);
    });
  }
});
