import { expect, test } from '@playwright/test';
import { PASSWORD, VIEWPORTS, uniqueEmail } from './helpers';

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`inscription par email (${device})`, () => {
    test.use({ viewport });

    test('refuse une confirmation différente puis accepte la bonne', async ({ page }) => {
      await page.goto('/fr/inscription');
      await page.getByLabel('Prénom').fill('Jean');
      await page.getByLabel('Nom', { exact: true }).fill('Dupont');
      await page.getByLabel('Email').fill(uniqueEmail('confirm'));
      await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
      await page
        .getByLabel('Confirmer le mot de passe', { exact: true })
        .fill('autre-mot-de-passe');
      await page.getByRole('button', { name: 'Créer mon compte' }).click();

      await expect(page.getByText('Les mots de passe ne correspondent pas')).toBeVisible();
      await expect(page).toHaveURL(/\/fr\/inscription$/);

      await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(PASSWORD);
      await page.getByRole('button', { name: 'Créer mon compte' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });
  });
}
