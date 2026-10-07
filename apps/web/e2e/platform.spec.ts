import { expect, test } from '@playwright/test';
import {
  VIEWPORTS,
  PASSWORD,
  expectNoHorizontalScroll,
  loginViaUi,
  logoutViaUi,
  registerViaUi,
  setPlatformRole,
  uniqueEmail,
} from './helpers';

/**
 * Rôles de plateforme : bascule « Mon espace | Plateforme », arrivée sur /platform, gestion des comptes
 * (rôle, suspension). Chaque parcours est joué sur mobile, tablette et bureau.
 */
for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`plateforme (${device})`, () => {
    test.use({ viewport });

    const isMobile = viewport.width < 768;

    test('un compte ordinaire ne voit pas l’interrupteur et ne peut pas entrer sur /platform', async ({
      page,
    }) => {
      await registerViaUi(page, uniqueEmail('ordinaire'));
      await expect(page.getByRole('switch')).toHaveCount(0);
      await page.goto('/platform');
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.goto('/platform/users');
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByText('Votre rôle')).toHaveCount(0);
    });

    test('un visiteur sans session est renvoyé à la connexion, puis revient sur /platform', async ({
      page,
    }) => {
      await page.goto('/platform');
      await expect(page).toHaveURL(/\/connexion\?next=%2Fplatform$/);
    });

    test('modérateur : arrive sur /platform, bascule dans les deux sens, n’a que l’accueil', async ({
      page,
    }) => {
      const email = uniqueEmail('moderateur');
      await registerViaUi(page, email);
      await setPlatformRole(email, 'MODERATOR');
      await logoutViaUi(page);
      await loginViaUi(page, email);

      // Toujours /platform à la connexion.
      await expect(page).toHaveURL(/\/platform$/);
      await expect(page.getByTestId('platform-role')).toContainText('Modérateur');
      await expectNoHorizontalScroll(page);

      // Menu : seulement l'accueil (aucune permission sur les comptes).
      await expect(page.getByRole('link', { name: 'Comptes' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Réinitialiser un PIN' })).toHaveCount(0);
      const mobileNav = page.getByRole('navigation', { name: 'Navigation de la plateforme' });
      if (isMobile) await expect(mobileNav).toBeVisible();
      else await expect(mobileNav).toBeHidden();

      const toggle = page.getByRole('switch');
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
      await toggle.click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
      await expectNoHorizontalScroll(page);
      await page.getByRole('switch').click();
      await expect(page).toHaveURL(/\/platform$/);

      // La page des comptes lui est refusée.
      await page.goto('/platform/users');
      await expect(
        page.getByRole('alert').filter({ hasText: 'réservé aux équipes de la plateforme' }),
      ).toBeVisible();
    });

    test('adresse inconnue sous /platform : page « introuvable » dans l’espace plateforme', async ({
      page,
    }) => {
      const email = uniqueEmail('moderateur404');
      await registerViaUi(page, email);
      await setPlatformRole(email, 'MODERATOR');
      await page.goto('/platform/inconnue');
      await expect(page.getByText('Cette page n’existe pas')).toBeVisible();
      await expect(page.getByRole('switch')).toBeVisible();
    });

    test('administrateur : nomme un modérateur, le suspend, puis le rétablit', async ({
      page,
      browser,
    }) => {
      // La cible s'inscrit dans son propre navigateur.
      const targetEmail = uniqueEmail('cible');
      const targetContext = await browser.newContext({ viewport });
      const targetPage = await targetContext.newPage();
      await registerViaUi(targetPage, targetEmail, 'Cible');
      await logoutViaUi(targetPage);

      const adminEmail = uniqueEmail('admin');
      await registerViaUi(page, adminEmail);
      await setPlatformRole(adminEmail, 'ADMIN');
      await logoutViaUi(page);
      await loginViaUi(page, adminEmail);
      await expect(page).toHaveURL(/\/platform$/);
      await expect(page.getByTestId('platform-role')).toContainText('Administrateur');

      await page.getByRole('link', { name: 'Comptes' }).click();
      await expect(page).toHaveURL(/\/platform\/users$/);
      await page.getByLabel('Rechercher un compte').fill(targetEmail);
      await expect(page.getByText('1 compte', { exact: true })).toBeVisible();
      await expectNoHorizontalScroll(page);

      // Rôle : l'ADMIN ne peut proposer que Modérateur / Utilisateur.
      const roleSelect = page.getByRole('combobox', { name: 'Rôle de Cible Dupont' });
      await expect(roleSelect.locator('option')).toHaveText(['Modérateur', 'Utilisateur']);
      await roleSelect.selectOption('MODERATOR');
      await expect(
        page.getByText('Rôle modifié : Cible Dupont est maintenant Modérateur.').first(),
      ).toBeVisible();

      // Suspension en deux temps.
      await page.getByRole('button', { name: 'Suspendre' }).click();
      await page.getByRole('button', { name: 'Confirmer la suspension' }).click();
      await expect(page.getByText('Cible Dupont est suspendu.').first()).toBeVisible();
      await expect(
        page.getByText('Suspendu', { exact: true }).locator('visible=true'),
      ).toBeVisible();

      // Le compte suspendu ne peut plus se connecter.
      await loginViaUi(targetPage, targetEmail);
      await expect(
        targetPage.getByRole('alert').filter({ hasText: 'Ce compte est suspendu' }),
      ).toBeVisible();
      await expect(targetPage).toHaveURL(/\/connexion$/);

      // Rétabli : il se reconnecte, et arrive sur /platform puisqu'il est maintenant modérateur.
      await page.getByRole('button', { name: 'Rétablir' }).click();
      await expect(page.getByText('Cible Dupont est rétabli.').first()).toBeVisible();
      await loginViaUi(targetPage, targetEmail);
      await expect(targetPage).toHaveURL(/\/platform$/);
      await expect(targetPage.getByTestId('platform-role')).toContainText('Modérateur');
      await targetContext.close();
    });

    test('super administrateur : peut nommer un administrateur', async ({ page }) => {
      const targetEmail = uniqueEmail('futuradmin');
      const adminEmail = uniqueEmail('super');
      await registerViaUi(page, adminEmail);
      await setPlatformRole(adminEmail, 'SUPER_ADMIN');
      // Un second compte, créé dans le même navigateur puis laissé de côté.
      const other = await page.context().browser()!.newContext({ viewport });
      const otherPage = await other.newPage();
      await registerViaUi(otherPage, targetEmail, 'Futur');
      await other.close();

      await page.goto('/platform/users');
      await page.getByLabel('Rechercher un compte').fill(targetEmail);
      await expect(page.getByText('1 compte', { exact: true })).toBeVisible();
      const roleSelect = page.getByRole('combobox', { name: 'Rôle de Futur Dupont' });
      await expect(roleSelect.locator('option')).toHaveCount(4);
      await roleSelect.selectOption('ADMIN');
      await expect(
        page.getByText('Rôle modifié : Futur Dupont est maintenant Administrateur.').first(),
      ).toBeVisible();
    });
  });
}

test.describe('plateforme (anglais)', () => {
  test('inscrit en anglais : le toggle, la navigation et les écrans sont traduits', async ({
    page,
  }) => {
    const email = uniqueEmail('admin-en');
    await page.goto('/en/register');
    await page.getByLabel('First name').fill('John');
    await page.getByLabel('Last name', { exact: true }).fill('Doe');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create my account' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await setPlatformRole(email, 'ADMIN');

    await page.goto('/platform');
    await expect(page.getByTestId('platform-role')).toHaveText('Your role: Administrator');
    await expect(page.getByRole('link', { name: 'Accounts' }).first()).toBeVisible();
    await expect(page.getByRole('switch', { name: /Switch between the platform/ })).toBeVisible();
    await page.getByRole('link', { name: 'Accounts' }).first().click();
    await expect(page.getByLabel('Search for an account')).toBeVisible();
  });
});
