import { expect, test } from '@playwright/test';
import { registerViaUi, uniqueEmail } from './helpers';

test.describe('paroisses', () => {
  test('crée une paroisse depuis le dashboard puis la retrouve sur sa page publique', async ({
    page,
  }) => {
    const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const parishName = `Saint Jean ${id}`;

    await registerViaUi(page, uniqueEmail('marie'), 'Marie');

    await page.goto('/dashboard/parishes');
    await page.getByRole('button', { name: '+ Nouvelle paroisse' }).click();
    await page.getByLabel('Nom de la paroisse').fill(parishName);
    // Cameroun par défaut : région → ville → quartier en listes déroulantes.
    await expect(page.getByLabel('Pays', { exact: true })).toHaveValue('Cameroun');
    await page.getByLabel('Région', { exact: false }).selectOption('Littoral');
    await page.getByLabel('Ville', { exact: true }).selectOption('Douala');
    await page.getByLabel('Quartier', { exact: false }).selectOption('Bonanjo');
    await page.getByRole('button', { name: 'Créer la paroisse' }).click();

    await expect(page.getByRole('heading', { name: parishName })).toBeVisible();

    // La page publique est servie par id (et non plus par slug).
    await page.getByRole('link', { name: new RegExp(parishName) }).click();
    await page.waitForURL(/\/dashboard\/parishes\/[^/]+$/);
    const parishId = page.url().split('/').pop();
    await page.goto(`/fr/paroisses/${parishId}`);
    await expect(page.getByRole('heading', { level: 1, name: parishName })).toBeVisible();
  });
});
