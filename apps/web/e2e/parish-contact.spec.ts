import { expect, test } from '@playwright/test';
import { registerViaUi, uniqueEmail, VIEWPORTS } from './helpers';

/** Téléphone / email de la paroisse : saisie guidée (format du pays), liens cliquables côté public. */
for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`contact d’une paroisse — ${device} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport });

    test('saisie masquée du téléphone, puis liens tel: et mailto: sur la page publique', async ({
      page,
    }) => {
      const token = `Zc${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await registerViaUi(page, uniqueEmail('contact'));
      await page.goto('/dashboard/parishes');
      await page.getByRole('button', { name: '+ Nouvelle paroisse' }).click();

      const phone = page.getByLabel(/^Téléphone/);
      await expect(phone).toHaveAttribute('placeholder', '6 77 12 34 56');
      await expect(page.getByTestId('phone-dial')).toHaveText('+237');

      await page.getByLabel('Nom de la paroisse').fill(`Saint Joseph ${token}`);
      await page.getByLabel('Région', { exact: false }).selectOption('Centre');
      await page.getByLabel('Ville', { exact: true }).selectOption('Yaoundé');
      await phone.fill('677123456');
      await expect(phone).toHaveValue('6 77 12 34 56');
      await page.getByLabel(/^Email de la paroisse/).fill(`contact-${token}@paroisse.cm`);
      await page.getByRole('button', { name: 'Créer la paroisse' }).click();

      await page.getByRole('link', { name: new RegExp(token) }).click();
      await page.waitForURL(/\/dashboard\/parishes\/[^/]+$/);
      const parishId = page.url().split('/').pop();

      await page.goto(`/fr/paroisses/${parishId}`);
      await expect(page.getByRole('link', { name: '+237 6 77 12 34 56' })).toHaveAttribute(
        'href',
        'tel:+237677123456',
      );
      await expect(
        page.getByRole('link', { name: `contact-${token}@paroisse.cm` }),
      ).toHaveAttribute('href', `mailto:contact-${token}@paroisse.cm`);
    });
  });
}
