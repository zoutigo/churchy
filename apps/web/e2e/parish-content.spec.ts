import { expect, test } from '@playwright/test';
import { VIEWPORTS, hasHorizontalOverflow, registerViaUi, uniqueEmail } from './helpers';

const inDays = (days: number) => {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000);
  // Format du champ datetime-local : « AAAA-MM-JJTHH:MM » en heure locale.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`;
};

test.describe('gestion du contenu public d’une paroisse (tableau de bord → site public)', () => {
  test('complète l’identité, publie et supprime une annonce et une activité', async ({ page }) => {
    const token = `Zd${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const name = `Sainte ${token}`;
    await registerViaUi(page, uniqueEmail('content'));

    // Création de la paroisse depuis l'interface.
    await page.goto('/dashboard/parishes');
    await page.getByRole('button', { name: '+ Nouvelle paroisse' }).click();
    await page.getByLabel('Nom de la paroisse').fill(name);
    await page.getByLabel('Ville').fill('Nantes');
    await page.getByRole('button', { name: 'Créer la paroisse' }).click();
    await page.getByRole('link', { name: new RegExp(name) }).click();
    await page.waitForURL(/\/dashboard\/parishes\/[^/]+$/);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    const parishId = page.url().split('/').pop() as string;

    // Identité publique.
    await page.getByLabel('Adresse', { exact: true }).fill('3 rue de la Paix');
    await page.getByLabel('Quartier').fill('Centre');
    await page.getByLabel('Site web').fill('javascript:alert(1)');
    await expect(page.getByText('Adresse web invalide (http ou https)')).toBeVisible();
    await page.getByLabel('Site web').fill('https://paroisse-nantes.example');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Informations enregistrées.')).toBeVisible();

    // Annonce.
    await page.goto(`/dashboard/parishes/${parishId}/announcements`);
    await expect(page.getByText('Aucune annonce pour l’instant.')).toBeVisible();
    await page.getByRole('button', { name: '+ Nouvelle annonce' }).click();
    await page.getByLabel('Titre').fill('Collecte de printemps');
    await page.getByLabel('Contenu').fill('Une collecte aura lieu dimanche.');
    await page.getByRole('button', { name: 'Publier l’annonce' }).click();
    await expect(page.getByText('Collecte de printemps')).toBeVisible();

    // Activité (champ date du navigateur : heure locale, convertie pour l'API).
    await page.goto(`/dashboard/parishes/${parishId}/activities`);
    await page.getByRole('button', { name: '+ Nouvelle activité' }).click();
    await page.getByLabel('Titre').fill('Pèlerinage');
    await page.getByLabel('Description').fill('Marche vers le sanctuaire.');
    await page.getByLabel('Date et heure').fill(inDays(15));
    await page.getByLabel('Lieu').fill('Parvis de l’église');
    await page.getByRole('button', { name: 'Publier l’activité' }).click();
    await expect(page.getByText('Pèlerinage')).toBeVisible();

    // Visible publiquement, avec l'adresse saisie.
    await page.goto(`/paroisses/${parishId}`);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.getByText(/3 rue de la Paix, Centre, Nantes/).first()).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Collecte de printemps' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pèlerinage' })).toBeVisible();

    // Suppression en deux temps : « Supprimer » puis « Confirmer ».
    await page.goto(`/dashboard/parishes/${parishId}/announcements`);
    await page.getByRole('button', { name: 'Supprimer Collecte de printemps' }).click();
    await page
      .getByRole('button', { name: 'Confirmer la suppression de Collecte de printemps' })
      .click();
    await expect(page.getByText('Aucune annonce pour l’instant.')).toBeVisible();

    await page.goto(`/dashboard/parishes/${parishId}/activities`);
    await page.getByRole('button', { name: 'Supprimer Pèlerinage' }).click();
    await page.getByRole('button', { name: 'Confirmer la suppression de Pèlerinage' }).click();
    await expect(page.getByText('Aucune activité pour l’instant.')).toBeVisible();

    await page.goto(`/paroisses/${parishId}/annonces`);
    await expect(page.getByText('Aucune annonce pour l’instant')).toBeVisible();
    await page.goto(`/paroisses/${parishId}/activites`);
    await expect(page.getByText('Aucune activité à venir')).toBeVisible();
  });

  test('crée une célébration annoncée depuis l’interface : elle apparaît « feuille en préparation »', async ({
    page,
  }) => {
    const token = `Zc${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await registerViaUi(page, uniqueEmail('announced'));
    const parish = await (
      await page.request.post('http://localhost:3211/api/parishes', {
        data: { name: `Paroisse ${token}`, city: 'Brest', country: 'France' },
      })
    ).json();
    const template = await (
      await page.request.post(`http://localhost:3211/api/parishes/${parish.id}/templates`, {
        data: { name: 'Messe', type: 'SUNDAY_MASS' },
      })
    ).json();

    await page.goto(`/dashboard/parishes/${parish.id}/celebrations/new`);
    await page.getByLabel('ID du modèle').fill(template.id);
    await page.getByLabel('Titre').fill('Messe annoncée par le formulaire');
    // Non-régression : une saisie datetime-local (sans fuseau) était rejetée par la validation.
    await page.getByLabel('Date et heure').fill(inDays(5));
    await page.getByLabel('Annoncer au public').check();
    await page.getByRole('button', { name: 'Créer la célébration' }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/parishes/${parish.id}/celebrations$`));
    await expect(page.getByText('Annoncée au public')).toBeVisible();

    await page.goto(`/paroisses/${parish.id}/messes`);
    await expect(page.getByText('Messe annoncée par le formulaire')).toBeVisible();
    await expect(page.getByText('Feuille en préparation')).toBeVisible();
  });

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`tableau de bord adapté à l’écran (${device})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await registerViaUi(page, uniqueEmail(`dash-${device}`));
      await page.goto('/dashboard/parishes');

      const sidebar = page.getByRole('complementary');
      const mobileNav = page.getByRole('navigation', { name: 'Navigation du tableau de bord' });
      if (viewport.width < 768) {
        await expect(sidebar).toBeHidden();
        await expect(mobileNav).toBeVisible();
        await mobileNav.getByRole('link', { name: 'Tableau de bord' }).click();
        await expect(page).toHaveURL(/\/dashboard$/);
      } else {
        await expect(sidebar).toBeVisible();
        await expect(mobileNav).toBeHidden();
      }
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});
