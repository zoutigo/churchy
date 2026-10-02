import { expect, test } from '@playwright/test';
import { registerViaUi, uniqueEmail, VIEWPORTS } from './helpers';

/** Localisation d'une paroisse : Cameroun par défaut, région → ville → quartier, saisie manuelle. */
for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`localisation d’une paroisse — ${device} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport });

    test('crée une paroisse avec un quartier de la liste puis un quartier saisi à la main', async ({
      page,
    }) => {
      const token = `Zl${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await registerViaUi(page, uniqueEmail('loc'));
      await page.goto('/dashboard/parishes');
      await page.getByRole('button', { name: '+ Nouvelle paroisse' }).click();

      // Aucun débordement horizontal, quelle que soit la taille d'écran.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);

      await expect(page.getByLabel('Pays', { exact: true })).toHaveValue('Cameroun');
      const city = page.getByLabel('Ville', { exact: true });
      await expect(city).toBeDisabled();

      await page.getByLabel('Nom de la paroisse').fill(`Saint Joseph ${token}`);
      await page.getByLabel('Région', { exact: false }).selectOption('Centre');
      await expect(city.locator('option', { hasText: 'Douala' })).toHaveCount(0);
      await city.selectOption('Yaoundé');
      await page.getByLabel('Quartier', { exact: false }).selectOption('Autre quartier…');
      await page.getByLabel('Nom du quartier').fill(`Nkol-${token}`);
      await page.getByLabel(/Complément d’adresse/).fill('En face de la poste centrale');
      await page.getByRole('button', { name: 'Créer la paroisse' }).click();

      await page.getByRole('link', { name: new RegExp(token) }).click();
      await page.waitForURL(/\/dashboard\/parishes\/[^/]+$/);
      const parishId = page.url().split('/').pop();

      // Le quartier et le complément d'adresse apparaissent sur le site public.
      await page.goto(`/paroisses/${parishId}`);
      await expect(page.getByText(`Nkol-${token}, Yaoundé`).first()).toBeAttached();
      await expect(page.getByText('En face de la poste centrale').first()).toBeAttached();

      // La recherche publique retrouve la paroisse par son quartier saisi à la main.
      await page.goto(`/paroisses?q=${encodeURIComponent(`Nkol-${token}`)}`);
      await expect(page.getByText(`Saint Joseph ${token}`)).toBeVisible();
    });
  });
}
