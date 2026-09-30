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
    await page.getByLabel('Ville').fill('Douala');
    await page.getByLabel('Pays').fill('Cameroun');
    await page.getByRole('button', { name: 'Créer la paroisse' }).click();

    await expect(page.getByRole('heading', { name: parishName })).toBeVisible();

    const slug = parishName.toLowerCase().replace(/\s+/g, '-');
    await page.goto(`/p/${slug}`);
    await expect(page.getByText(parishName).first()).toBeVisible();
  });
});
