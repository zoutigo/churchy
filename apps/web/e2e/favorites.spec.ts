import { expect, test, type Page } from '@playwright/test';
import {
  VIEWPORTS,
  hasHorizontalOverflow,
  loginViaUi,
  logoutViaUi,
  registerViaUi,
  seedParish,
  uniqueEmail,
  type SeededParish,
} from './helpers';

const FAVORITES_KEY = 'churchy:favorites';
const toast = (page: Page, text: string) =>
  page.locator('ol > li[data-state="open"]').filter({ hasText: text }).first();

/** Sur mobile et tablette étroite, les liens de l'en-tête sont dans le menu repliable. */
async function openHeaderMenu(page: Page) {
  const burger = page.getByRole('button', { name: 'Ouvrir le menu' });
  if (await burger.isVisible()) await burger.click();
}

async function searchAndFind(page: Page, parish: SeededParish) {
  await page.goto(`/fr/paroisses?q=${parish.token.toLowerCase()}`);
  const card = page.getByRole('article').filter({ hasText: parish.name });
  await expect(card).toBeVisible();
  return card;
}

test.describe('paroisses favorites', () => {
  let parish: SeededParish;
  let other: SeededParish;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await registerViaUi(page, uniqueEmail('fav-seed'));
    parish = await seedParish(page);
    other = await seedParish(page);
    await page.close();
  });

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${device} (${viewport.width}×${viewport.height})`, () => {
      test.use({ viewport });

      test('visiteur : étoile sur le résultat → raccourci sur la landing, conservé après rechargement', async ({
        page,
      }) => {
        // Aucun favori : pas de bloc sur la landing.
        await page.goto('/');
        await expect(page.getByTestId('favorites-shelf')).toHaveCount(0);

        const card = await searchAndFind(page, parish);
        await card.getByRole('button', { name: /Ajouter aux favoris/ }).click();
        await expect(toast(page, 'Ajoutée à vos favoris')).toBeVisible();
        await expect(card.getByRole('button', { name: /Retirer des favoris/ })).toHaveAttribute(
          'aria-pressed',
          'true',
        );

        // Plus besoin de chercher : la paroisse est sur la landing.
        await page.goto('/');
        const shelf = page.getByTestId('favorites-shelf');
        await expect(shelf.getByRole('heading', { name: 'Ma paroisse' })).toBeVisible();
        await expect(shelf.getByRole('heading', { name: parish.name })).toBeVisible();
        await expect(shelf).toContainText('Croix-Rousse, Lyon');

        await page.reload();
        await expect(page.getByTestId('favorites-shelf')).toContainText(parish.name);
        expect(await hasHorizontalOverflow(page)).toBe(false);

        // Un clic mène à la paroisse sans passer par la recherche.
        await page
          .getByTestId('favorites-shelf')
          .getByRole('link', { name: `Voir la paroisse ${parish.name}` })
          .click();
        await expect(page).toHaveURL(`/fr/paroisses/${parish.id}`);
      });

      test('visiteur : le lien « Mes favoris » du menu mène à la liste, qui permet de retirer', async ({
        page,
      }) => {
        await page.addInitScript(
          ([key, ids]) => {
            if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(ids));
          },
          [FAVORITES_KEY, [parish.id, other.id]] as const,
        );
        await page.goto('/');
        await openHeaderMenu(page);
        const link = page.getByRole('link', { name: /Mes favoris/ }).first();
        await expect(link).toContainText('2');
        await link.click();

        await expect(page).toHaveURL('/fr/favoris');
        await expect(page.getByRole('heading', { level: 1, name: 'Mes favoris' })).toBeVisible();
        await expect(page.getByRole('article')).toHaveCount(2);
        expect(await hasHorizontalOverflow(page)).toBe(false);

        const card = page.getByRole('article').filter({ hasText: parish.name });
        await card.getByRole('button', { name: /Retirer des favoris/ }).click();
        await expect(toast(page, 'Favori retiré')).toBeVisible();
        await expect(page.getByRole('article')).toHaveCount(1);
        await expect(page.getByRole('article')).toContainText(other.name);
      });

      test('visiteur : bouton sur la page de la paroisse, ajout puis retrait', async ({ page }) => {
        await page.goto(`/fr/paroisses/${parish.id}`);
        const button = page.getByRole('button', { name: 'Ajouter aux favoris' });
        await expect(button).toBeEnabled();
        await button.click();
        await expect(toast(page, 'Ajoutée à vos favoris')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Dans mes favoris' })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        expect(await page.evaluate((k) => localStorage.getItem(k), FAVORITES_KEY)).toContain(
          parish.id,
        );

        await page.getByRole('button', { name: 'Dans mes favoris' }).click();
        await expect(toast(page, 'Favori retiré')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Ajouter aux favoris' })).toBeVisible();
      });

      test('visiteur : plus de 10 favoris refusés, avec un message', async ({ page }) => {
        await page.addInitScript(
          ([key]) => {
            if (!localStorage.getItem(key))
              localStorage.setItem(
                key,
                JSON.stringify(Array.from({ length: 10 }, (_, i) => `x${i}`)),
              );
          },
          [FAVORITES_KEY] as const,
        );
        await page.goto(`/fr/paroisses/${parish.id}`);
        await page.getByRole('button', { name: 'Ajouter aux favoris' }).click();
        await expect(toast(page, 'Limite de favoris atteinte')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Ajouter aux favoris' })).toBeVisible();
      });

      test('connecté : favoris en base, fusion des favoris de l’appareil, retrouvés sur un autre appareil', async ({
        page,
        browser,
      }) => {
        const email = uniqueEmail('fav-user');

        // 1. Visiteur : un favori sur l'appareil.
        await page.goto(`/fr/paroisses/${parish.id}`);
        await page.getByRole('button', { name: 'Ajouter aux favoris' }).click();
        await expect(toast(page, 'Ajoutée à vos favoris')).toBeVisible();

        // 2. Inscription : le favori de l'appareil est versé dans le compte, l'appareil est vidé.
        await registerViaUi(page, email);
        await page.goto('/fr/favoris');
        await expect(page.getByRole('article').filter({ hasText: parish.name })).toBeVisible();
        expect(await page.evaluate((k) => localStorage.getItem(k), FAVORITES_KEY)).toBeNull();

        // 3. Ajout connecté : persisté en base (aucune écriture locale).
        await page.goto(`/fr/paroisses/${other.id}`);
        await page.getByRole('button', { name: 'Ajouter aux favoris' }).click();
        await expect(toast(page, 'Ajoutée à vos favoris')).toBeVisible();
        expect(await page.evaluate((k) => localStorage.getItem(k), FAVORITES_KEY)).toBeNull();

        // 4. Autre appareil (contexte vierge) : même compte, mêmes favoris, dans l'ordre d'ajout.
        const ctx = await browser.newContext({ viewport });
        const page2 = await ctx.newPage();
        await loginViaUi(page2, email);
        await expect(page2).toHaveURL(/\/dashboard$/);
        await page2.goto('/');
        const shelf = page2.getByTestId('favorites-shelf');
        await expect(shelf.getByRole('heading', { name: 'Mes paroisses favorites' })).toBeVisible();
        await expect(shelf.getByRole('article')).toHaveCount(2);
        await expect(shelf.getByRole('article').first()).toContainText(parish.name);

        // 5. Retrait connecté, puis déconnexion : l'appareil ne garde rien du compte.
        await page2.goto('/fr/favoris');
        await page2
          .getByRole('article')
          .filter({ hasText: parish.name })
          .getByRole('button', { name: /Retirer des favoris/ })
          .click();
        await expect(toast(page2, 'Favori retiré')).toBeVisible();
        await page2.reload();
        await expect(page2.getByRole('article')).toHaveCount(1);

        await page2.goto('/dashboard');
        await logoutViaUi(page2);
        await page2.goto('/');
        await expect(page2.getByTestId('favorites-shelf')).toHaveCount(0);
        await ctx.close();
      });

      test('connecté : « Mes favoris » est dans le menu du tableau de bord', async ({ page }) => {
        await registerViaUi(page, uniqueEmail('fav-menu'));
        const nav =
          viewport.width >= 768
            ? page.locator('aside nav')
            : page.getByRole('navigation', { name: 'Navigation du tableau de bord' });
        await nav.getByRole('link', { name: 'Mes favoris' }).click();
        // On reste dans le tableau de bord : la navigation du dashboard est toujours là.
        await expect(page).toHaveURL('/dashboard/favorites');
        await expect(nav).toBeVisible();
        await expect(page.getByRole('heading', { level: 1, name: 'Mes favoris' })).toBeVisible();
        await expect(page.getByText('Aucune paroisse en favori pour l’instant')).toBeVisible();
        expect(await hasHorizontalOverflow(page)).toBe(false);
        // « Trouver une paroisse » s'ouvre dans un nouvel onglet : le dashboard reste en place.
        const popupPromise = page.waitForEvent('popup');
        await page.getByRole('main').getByRole('link', { name: 'Trouver une paroisse' }).click();
        const popup = await popupPromise;
        await expect(popup).toHaveURL('/fr/paroisses');
        await expect(page).toHaveURL('/dashboard/favorites');
      });

      test('connecté : les favoris s’affichent dans le tableau de bord, on peut en retirer un', async ({
        page,
      }) => {
        await registerViaUi(page, uniqueEmail('fav-dash'));
        await page.goto(`/fr/paroisses/${parish.id}`);
        await page.getByRole('button', { name: 'Ajouter aux favoris' }).click();
        await expect(toast(page, 'Ajoutée à vos favoris')).toBeVisible();

        await page.goto('/dashboard/favorites');
        const card = page.getByRole('article').filter({ hasText: parish.name });
        await expect(card).toBeVisible();
        const view = card.getByRole('link', { name: `Voir la paroisse ${parish.name}` });
        await expect(view).toHaveAttribute('href', `/fr/paroisses/${parish.id}`);
        await expect(view).toHaveAttribute('target', '_blank');
        expect(await hasHorizontalOverflow(page)).toBe(false);

        // Le site public s'ouvre dans un nouvel onglet ; le dashboard reste ouvert.
        const popupPromise = page.waitForEvent('popup');
        await view.click();
        const popup = await popupPromise;
        await expect(popup).toHaveURL(`/fr/paroisses/${parish.id}`);
        await popup.close();
        await expect(page).toHaveURL('/dashboard/favorites');

        await card.getByRole('button', { name: /Retirer des favoris/ }).click();
        await expect(toast(page, 'Favori retiré')).toBeVisible();
        await expect(page.getByText('Aucune paroisse en favori pour l’instant')).toBeVisible();
        await expect(page).toHaveURL('/dashboard/favorites');
      });

      test('échec de l’API : l’ajout est annulé et une erreur est annoncée', async ({ page }) => {
        await registerViaUi(page, uniqueEmail('fav-err'));
        await page.goto(`/fr/paroisses/${parish.id}`);
        const button = page.getByRole('button', { name: 'Ajouter aux favoris' });
        await expect(button).toBeEnabled();
        await page.route('**/api/favorites/*', (route) =>
          route.request().method() === 'PUT'
            ? route.fulfill({
                status: 409,
                contentType: 'application/json',
                body: JSON.stringify({
                  statusCode: 409,
                  message: '10 paroisses favorites au maximum',
                }),
              })
            : route.continue(),
        );
        await button.click();
        await expect(toast(page, 'Impossible d’ajouter ce favori')).toBeVisible();
        await expect(toast(page, '10 paroisses favorites au maximum')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Ajouter aux favoris' })).toBeVisible();
      });
    });
  }
});

test.describe('aperçu des liens partagés (Open Graph)', () => {
  let parish: SeededParish;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await registerViaUi(page, uniqueEmail('og-seed'));
    parish = await seedParish(page);
    await page.close();
  });

  const meta = (page: Page, key: string) =>
    page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute('content');

  test('la landing porte titre, description, image 1200×630 et carte Twitter', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    expect(await meta(page, 'og:title')).toBe('Churchy — Votre paroisse, à portée de main');
    expect(await meta(page, 'og:description')).toContain('messes');
    expect(await meta(page, 'og:site_name')).toBe('Churchy');
    expect(await meta(page, 'og:locale')).toBe('fr_FR');
    expect(await meta(page, 'og:image:width')).toBe('1200');
    expect(await meta(page, 'og:image:height')).toBe('630');
    expect(await meta(page, 'twitter:card')).toBe('summary_large_image');

    // L'image est réellement servie, en PNG, sans authentification.
    const image = new URL((await meta(page, 'og:image'))!);
    const res = await request.get(`${image.pathname}${image.search}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
    expect((await res.body()).byteLength).toBeGreaterThan(1000);
  });

  test('la page d’une paroisse porte son nom, sa description et l’image du site', async ({
    page,
  }) => {
    await page.goto(`/fr/paroisses/${parish.id}`);
    expect(await meta(page, 'og:title')).toBe(`${parish.name} — Churchy`);
    expect(await meta(page, 'og:description')).toBe('Une paroisse accueillante.');
    expect(await meta(page, 'og:url')).toContain(`/fr/paroisses/${parish.id}`);
    expect(await meta(page, 'og:image')).toContain('opengraph-image');
    expect(await meta(page, 'twitter:card')).toBe('summary_large_image');
  });
});
