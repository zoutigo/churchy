import { expect, test, type Page } from '@playwright/test';
import { VIEWPORTS, hasHorizontalOverflow, registerViaUi, uniqueEmail } from './helpers';

const API = 'http://localhost:3211/api';

async function setup(page: Page, label: string) {
  await registerViaUi(page, uniqueEmail(`tpl-${label}`));
  const parish = await (
    await page.request.post(`${API}/parishes`, {
      data: { name: `Paroisse ${label} ${Date.now()}`, city: 'Lyon', country: 'France' },
    })
  ).json();
  const tpl = await (
    await page.request.post(`${API}/parishes/${parish.id}/templates`, {
      data: { name: 'Messe dominicale', type: 'SUNDAY_MASS', description: 'Pour le dimanche' },
    })
  ).json();
  for (const [i, title] of ['Chant d’entrée', 'Gloria', 'Credo'].entries()) {
    await page.request.post(`${API}/templates/${tpl.id}/steps`, {
      data: { title, key: `k${i}`, order: i + 1 },
    });
  }
  return { parishId: parish.id as string, templateId: tpl.id as string };
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`modèles de feuille — ${device}`, () => {
    test.use({ viewport });

    test('liste repliée, se déplie, se modifie et se supprime', async ({ page }) => {
      const { parishId } = await setup(page, device);
      await page.goto(`/dashboard/parishes/${parishId}/templates`);
      const card = page.getByTestId('template-card');

      // Replié : titre + sous-titre, aucune étape visible.
      await expect(card).toContainText('Messe dominicale');
      await expect(card).toContainText('3 étapes');
      await expect(card.getByText('Gloria')).toHaveCount(0);
      expect(await hasHorizontalOverflow(page)).toBe(false);

      // Le bouton déplie, puis replie.
      const toggle = card.getByRole('button', { expanded: false });
      await toggle.click();
      await expect(card.getByText('Gloria')).toBeVisible();
      await expect(card.getByText('Pour le dimanche')).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await card.getByRole('button', { expanded: true }).click();
      await expect(card.getByText('Gloria')).toHaveCount(0);

      // Modifier : formulaire prérempli ; renommer, retirer Gloria, ajouter une étape.
      await card.getByRole('button', { expanded: false }).click();
      await card.getByRole('button', { name: 'Modifier Messe dominicale' }).click();
      await expect(page.getByLabel('Nom du modèle')).toHaveValue('Messe dominicale');
      await expect(page.getByLabel('Étape 2', { exact: true })).toHaveValue('Gloria');
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.getByLabel('Nom du modèle').fill('Messe solennelle');
      await page.getByRole('button', { name: 'Retirer l’étape 2' }).click();
      await page.getByRole('button', { name: 'Ajouter une étape' }).click();
      await page.getByLabel('Étape 3', { exact: true }).fill('Envoi');
      await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();

      await expect(page.getByText('Modèle modifié', { exact: true })).toBeVisible();
      await expect(card).toContainText('Messe solennelle');
      await expect(card).toContainText('3 étapes');
      await card.getByRole('button', { expanded: false }).click();
      await expect(card.getByText('Envoi')).toBeVisible();
      await expect(card.getByText('Gloria')).toHaveCount(0);

      // Supprimer : en deux temps, avec toast ; la liste devient vide.
      await card.getByRole('button', { name: 'Supprimer Messe solennelle' }).click();
      await expect(card).toBeVisible(); // pas encore supprimé
      await card.getByRole('button', { name: /Confirmer la suppression/ }).click();
      await expect(page.getByText('Modèle supprimé', { exact: true })).toBeVisible();
      await expect(page.getByTestId('template-card')).toHaveCount(0);
      await expect(page.getByText(/Aucun modèle pour l.instant/)).toBeVisible();
    });

    test('une erreur de l’API à la modification s’affiche (formulaire + toast), sans perdre la saisie', async ({
      page,
    }) => {
      const { parishId } = await setup(page, `err-${device}`);
      await page.route('**/api/templates/*', (route) =>
        route.request().method() === 'PATCH'
          ? route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ message: 'Erreur interne' }),
            })
          : route.continue(),
      );
      await page.goto(`/dashboard/parishes/${parishId}/templates`);
      await page.getByTestId('template-card').getByRole('button', { expanded: false }).click();
      await page.getByRole('button', { name: 'Modifier Messe dominicale' }).click();
      await page.getByLabel('Nom du modèle').fill('Nom perdu ?');
      await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
      await expect(
        page.getByText('Erreur lors de la modification du modèle').first(),
      ).toBeVisible();
      await expect(page.getByLabel('Nom du modèle')).toHaveValue('Nom perdu ?');
    });

    test('publier une feuille ramène à la série (on ne reste pas sur le formulaire)', async ({
      page,
    }) => {
      const { parishId, templateId } = await setup(page, `pub-${device}`);
      const start = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
      const series = await (
        await page.request.post(`${API}/parishes/${parishId}/celebrations`, {
          data: {
            title: 'Messe du dimanche',
            type: 'SUNDAY_MASS',
            templateId,
            schedule: { kind: 'dates', dates: [{ date: start, time: '10:00' }] },
          },
        })
      ).json();
      const occurrenceId = series.occurrences[0].id;
      const seriesUrl = `/dashboard/parishes/${parishId}/celebrations/${series.id}`;
      await page.goto(`${seriesUrl}/dates/${occurrenceId}`);
      await page.getByRole('button', { name: 'Créer la feuille' }).click();
      await page.getByRole('button', { name: 'Publier la feuille' }).click();
      await expect(
        page.locator('ol > li[data-state="open"]').getByText('Feuille publiée', { exact: true }),
      ).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${seriesUrl}$`));
      await expect(page.getByTestId('sheet-panel')).toHaveCount(0);
    });
  });
}
