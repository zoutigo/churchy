import { expect, test } from '@playwright/test';
import {
  VIEWPORTS,
  hasHorizontalOverflow,
  registerViaUi,
  seedParish,
  uniqueEmail,
} from './helpers';

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`pages d’erreur et cadre commun — ${device}`, () => {
    test.use({ viewport });

    test('adresse inconnue : belle page 404 avec en-tête, et retour à l’accueil', async ({
      page,
    }) => {
      const res = await page.goto('/cette-page-n-existe-pas');
      expect(res?.status()).toBe(404);
      await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
      await expect(page.getByTestId('error-page')).toHaveAttribute('data-kind', 'not-found');
      await expect(page.getByRole('link', { name: 'Churchy, accueil' })).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.getByRole('link', { name: 'Retour à l’accueil' }).click();
      await expect(page).toHaveURL(/\/$/);
    });

    test('paroisse inconnue et messe inconnue d’une paroisse : pages dédiées', async ({ page }) => {
      await page.goto('/paroisses/inconnue-xyz');
      await expect(page.getByRole('heading', { name: 'Paroisse introuvable' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Rechercher une paroisse' })).toBeVisible();

      await registerViaUi(page, uniqueEmail(`err-${device}`));
      const parish = await seedParish(page);
      await page.goto(`/paroisses/${parish.id}/messes/inconnue`);
      await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
      // La paroisse garde son bandeau : on peut y retourner.
      await expect(page.getByRole('heading', { name: parish.name })).toBeVisible();
      await page.getByRole('link', { name: 'Retour à la paroisse' }).click();
      await expect(page).toHaveURL(new RegExp(`/paroisses/${parish.id}$`));
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test('un mois de calendrier public s’affiche (pas de 404)', async ({ page }) => {
      await registerViaUi(page, uniqueEmail(`cal-${device}`));
      const parish = await seedParish(page);
      const res = await page.goto(`/paroisses/${parish.id}/calendrier`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: 'Page introuvable' })).toHaveCount(0);
    });

    test('tableau de bord : adresse inconnue → 404 DANS le tableau de bord (menu conservé)', async ({
      page,
    }) => {
      await registerViaUi(page, uniqueEmail(`dash404-${device}`));
      await page.goto('/dashboard/n-importe-quoi/du-tout');
      await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
      await expect(page.getByTestId('error-page')).toHaveAttribute('data-kind', 'not-found');
      // Le cadre du tableau de bord est toujours là (menu utilisateur).
      await expect(page.getByRole('button', { name: 'Menu utilisateur' })).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.getByRole('link', { name: 'Tableau de bord' }).last().click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('connexion et inscription : même cadre que le site, logo cliquable vers l’accueil', async ({
      page,
    }) => {
      for (const path of ['/login', '/register', '/forgot-password']) {
        await page.goto(path);
        await expect(page.getByRole('contentinfo')).toBeVisible(); // pied de page commun
        const logo = page.getByRole('link', { name: 'Churchy, accueil' });
        await expect(logo).toBeVisible();
        expect(await hasHorizontalOverflow(page)).toBe(false);
        await logo.click();
        await expect(page).toHaveURL(/\/$/);
      }
    });
  });
}
