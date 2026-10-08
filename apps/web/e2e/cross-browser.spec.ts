import { expect, test } from '@playwright/test';

/**
 * Lancé sur Chrome, Safari (WebKit, ordinateur et iPhone), Firefox et Chrome Android (voir `playwright.config.ts`).
 * Une erreur JavaScript propre à un moteur donne la page « Churchy est momentanément indisponible » :
 * ces pages doivent s'ouvrir et s'hydrater sans la moindre exception.
 */
const PAGES = ['/fr', '/en', '/fr/paroisses', '/fr/connexion', '/fr/inscription', '/fr/contact'];

for (const path of PAGES) {
  test(`${path} : s’affiche et s’hydrate sans erreur JavaScript`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    // GSI_LOGGER : Google Sign-In se plaint de l'origine locale (hors de notre code).
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|favicon|GSI_LOGGER/i.test(m.text())) {
        errors.push(`console: ${m.text()}`);
      }
    });

    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('momentanément indisponible')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('un compte déconnecté est renvoyé vers la connexion, sans erreur', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/fr\/connexion\?next=/);
  await expect(page.getByText('momentanément indisponible')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('stockage et cookies refusés (navigation privée) : le site reste utilisable', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const deny = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', { get: deny });
    Object.defineProperty(window, 'sessionStorage', { get: deny });
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/fr');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('momentanément indisponible')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});
