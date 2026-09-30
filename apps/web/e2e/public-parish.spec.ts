import { expect, test } from '@playwright/test';
import { registerViaUi, uniqueEmail } from './helpers';

const API = 'http://localhost:3211/api';

test.describe('page publique d’une paroisse', () => {
  test('affiche les célébrations publiées (et pas les brouillons) et mène à leur détail', async ({
    page,
  }) => {
    const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const parishName = `Sainte Claire ${id}`;
    const slug = parishName.toLowerCase().replace(/\s+/g, '-');

    await registerViaUi(page, uniqueEmail('public'));

    // Préparation via l'API, avec la session (cookies) du navigateur.
    const parish = await (
      await page.request.post(`${API}/parishes`, {
        data: { name: parishName, city: 'Lyon', country: 'France' },
      })
    ).json();
    const template = await (
      await page.request.post(`${API}/parishes/${parish.id}/templates`, {
        data: { name: 'Messe', type: 'SUNDAY_MASS' },
      })
    ).json();
    const celebrate = async (title: string) =>
      (
        await (
          await page.request.post(`${API}/parishes/${parish.id}/celebrations`, {
            data: { templateId: template.id, title, date: '2026-10-04T09:00:00.000Z' },
          })
        ).json()
      ).id as string;

    const publishedId = await celebrate('Messe publiée');
    await celebrate('Messe en brouillon');
    await page.request.post(`${API}/celebrations/${publishedId}/publish`);

    await page.goto(`/p/${slug}`);

    await expect(page.getByRole('heading', { name: parishName })).toBeVisible();
    await expect(page.getByText('Messe publiée')).toBeVisible();
    await expect(page.getByText('Messe en brouillon')).toHaveCount(0);

    // La carte mène à la page publique de la célébration (et non à une 404).
    await page.getByRole('link', { name: /Messe publiée/ }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${slug}/celebrations/${publishedId}$`));
    await expect(page.getByRole('heading', { name: 'Messe publiée' })).toBeVisible();
  });

  test('une paroisse inconnue affiche un message clair', async ({ page }) => {
    await page.goto('/p/paroisse-qui-nexiste-pas');
    await expect(page.getByText('Paroisse introuvable.')).toBeVisible();
  });
});
