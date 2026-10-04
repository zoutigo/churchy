import { expect, test, type Page } from '@playwright/test';
import {
  PASSWORD,
  VIEWPORTS,
  hasHorizontalOverflow,
  loginViaUi,
  registerViaUi,
  seedParish,
  uniqueEmail,
  type SeededParish,
} from './helpers';

const API = 'http://localhost:3211/api';
const lang = (page: Page) => page.locator('html').getAttribute('lang');
const switcher = (page: Page) =>
  page.getByRole('group', { name: /Changer la langue|Change language/ });
const localeCookie = async (page: Page) =>
  (await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value;
const accountLocale = async (page: Page) =>
  (await (await page.request.get(`${API}/auth/me`)).json()).locale as string;

test.describe('langues : français / anglais', () => {
  let parish: SeededParish;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await registerViaUi(page, uniqueEmail('i18n-seed'));
    parish = await seedParish(page);
    await page.close();
  });

  test.describe('adresses', () => {
    // Un navigateur configuré en anglais ne change rien : le français est la langue par défaut.
    test.use({ locale: 'en-US' });

    test('« / » mène à /fr, même si le navigateur est en anglais', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/fr$/);
      expect(await lang(page)).toBe('fr');
    });

    test('« / » respecte la langue mémorisée dans le cookie', async ({ page, context }) => {
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3210' },
      ]);
      await page.goto('/');
      await expect(page).toHaveURL(/\/en$/);
      expect(await lang(page)).toBe('en');
    });

    test('une ancienne adresse sans préfixe est redirigée vers le français', async ({ page }) => {
      await page.goto(`/paroisses/${parish.id}/messes`);
      await expect(page).toHaveURL(new RegExp(`/fr/paroisses/${parish.id}/messes$`));
    });

    test('une ancienne adresse suit la langue mémorisée, avec les segments traduits', async ({
      page,
      context,
    }) => {
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3210' },
      ]);
      await page.goto(`/paroisses/${parish.id}/messes`);
      await expect(page).toHaveURL(new RegExp(`/en/parishes/${parish.id}/masses$`));
      await expect(page.getByText('Messe annoncée').first()).toBeVisible();
    });

    test('les pages d’authentification existent dans les deux langues', async ({ page }) => {
      await page.goto('/en/login');
      await expect(page.getByLabel('Email')).toBeVisible();
      expect(await lang(page)).toBe('en');
      await page.goto('/fr/connexion');
      await expect(page.getByLabel('Email')).toBeVisible();
      expect(await lang(page)).toBe('fr');
    });

    test('une langue inconnue est une page introuvable', async ({ page }) => {
      const res = await page.goto('/de/paroisses');
      expect(res?.status()).toBe(404);
    });
  });

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`sélecteur de langue : ${device} (${viewport.width}×${viewport.height})`, () => {
      test.use({ viewport });

      test('visiteur : passe à l’anglais sur la même page traduite, mémorise le choix, et revient', async ({
        page,
      }) => {
        await page.goto(`/fr/paroisses/${parish.id}/messes`);
        // Visible sans ouvrir de menu, même sur mobile.
        await expect(switcher(page).first()).toBeVisible();
        expect(await hasHorizontalOverflow(page)).toBe(false);

        await page.getByRole('link', { name: 'English', exact: true }).first().click();
        await expect(page).toHaveURL(new RegExp(`/en/parishes/${parish.id}/masses$`));
        expect(await lang(page)).toBe('en');
        await expect(page.getByText('Messe annoncée').first()).toBeVisible();
        expect(await localeCookie(page)).toBe('en');
        await expect(
          page.getByRole('link', { name: 'English', exact: true }).first(),
        ).toHaveAttribute('aria-current', 'true');

        // Le choix est conservé : « / » retourne sur la version anglaise.
        await page.goto('/');
        await expect(page).toHaveURL(/\/en$/);

        await page.getByRole('link', { name: 'Français', exact: true }).first().click();
        await expect(page).toHaveURL(/\/fr$/);
        expect(await lang(page)).toBe('fr');
        expect(await localeCookie(page)).toBe('fr');
      });
    });
  }

  test('le changement de langue conserve la recherche', async ({ page }) => {
    await page.goto(`/fr/paroisses?q=${parish.token}`);
    await page.getByRole('link', { name: 'English', exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/en/parishes\\?q=${parish.token}$`));
    await expect(page.getByRole('article').filter({ hasText: parish.name })).toBeVisible();
  });

  test('chaque page paroisse déclare sa version dans l’autre langue (canonical, hreflang)', async ({
    page,
  }) => {
    await page.goto(`/en/parishes/${parish.id}`);
    const href = (sel: string) => page.locator(sel).first().getAttribute('href');
    expect(await href('link[rel="canonical"]')).toContain(`/en/parishes/${parish.id}`);
    expect(await href('link[rel="alternate"][hreflang="fr"]')).toContain(
      `/fr/paroisses/${parish.id}`,
    );
    expect(await href('link[rel="alternate"][hreflang="en"]')).toContain(
      `/en/parishes/${parish.id}`,
    );
    expect(await href('link[rel="alternate"][hreflang="x-default"]')).toContain(
      `/fr/paroisses/${parish.id}`,
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
  });

  test.describe('compte connecté : la langue est enregistrée en base', () => {
    test('l’inscription retient la langue de l’interface', async ({ page }) => {
      await page.goto('/en/register');
      await page.getByLabel('Prénom').fill('John');
      await page.getByLabel('Nom', { exact: true }).fill('Doe');
      await page.getByLabel('Email').fill(uniqueEmail('i18n-en'));
      await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
      await page.getByRole('button', { name: 'Créer mon compte' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      expect(await accountLocale(page)).toBe('en');
      // Le tableau de bord (sans préfixe) suit la langue du compte.
      await expect.poll(() => lang(page)).toBe('en');
    });

    test('changer de langue sur le tableau de bord est enregistré, rechargement compris', async ({
      page,
    }) => {
      await registerViaUi(page, uniqueEmail('i18n-switch'));
      expect(await accountLocale(page)).toBe('fr');
      expect(await lang(page)).toBe('fr');

      await page.getByRole('link', { name: 'English', exact: true }).click();
      await expect.poll(() => lang(page)).toBe('en');
      await expect(page).toHaveURL(/\/dashboard$/);
      expect(await accountLocale(page)).toBe('en');
      await expect(
        page.locator('ol > li[data-state="open"]').getByText('Language: English'),
      ).toBeVisible();

      await page.reload();
      expect(await lang(page)).toBe('en');
    });

    test('sur le site public, un connecté change aussi la langue de son compte', async ({
      page,
    }) => {
      await registerViaUi(page, uniqueEmail('i18n-public'));
      await page.goto(`/fr/paroisses/${parish.id}`);
      await page.getByRole('link', { name: 'English', exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`/en/parishes/${parish.id}$`));
      expect(await accountLocale(page)).toBe('en');
    });

    test('à la connexion, la langue du compte l’emporte sur celle de l’appareil', async ({
      page,
      browser,
    }) => {
      const email = uniqueEmail('i18n-login');
      // Compte créé en anglais, depuis un autre navigateur : celui-ci n'a aucun cookie de langue.
      const other = await browser.newPage();
      await other.request.post(`${API}/auth/register`, {
        data: { email, password: PASSWORD, firstName: 'Ann', lastName: 'Doe', locale: 'en' },
      });
      await other.close();

      await loginViaUi(page, email);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect.poll(() => lang(page)).toBe('en');
      expect(await localeCookie(page)).toBe('en');
    });

    test('un lien partagé en français reste en français pour un compte anglophone', async ({
      page,
    }) => {
      await page.goto('/en/register');
      await page.getByLabel('Prénom').fill('Ann');
      await page.getByLabel('Nom', { exact: true }).fill('Doe');
      await page.getByLabel('Email').fill(uniqueEmail('i18n-shared'));
      await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
      await page.getByRole('button', { name: 'Créer mon compte' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.goto(`/fr/paroisses/${parish.id}`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(parish.name);
      expect(await lang(page)).toBe('fr');
      await expect(page).toHaveURL(new RegExp(`/fr/paroisses/${parish.id}$`));
    });
  });
});
