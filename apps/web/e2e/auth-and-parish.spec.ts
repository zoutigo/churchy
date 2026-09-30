import { expect, test } from '@playwright/test';

const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test.describe('authentification', () => {
  test('inscription puis arrivée sur le dashboard', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Jean');
    await page.getByLabel('Nom', { exact: true }).fill('Dupont');
    await page.getByLabel('Email').fill(`jean-${unique()}@e2e.test`);
    await page.getByLabel('Mot de passe').fill('password123');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('une connexion refusée affiche un message lisible (pas « [object Object] »)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('inconnu@e2e.test');
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText('Identifiants invalides')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('paroisses', () => {
  test('crée une paroisse depuis le dashboard puis la retrouve sur sa page publique', async ({
    page,
  }) => {
    const id = unique();
    const parishName = `Saint Jean ${id}`;

    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Marie');
    await page.getByLabel('Nom', { exact: true }).fill('Martin');
    await page.getByLabel('Email').fill(`marie-${id}@e2e.test`);
    await page.getByLabel('Mot de passe').fill('password123');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

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
