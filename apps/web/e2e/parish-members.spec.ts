import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  VIEWPORTS,
  hasHorizontalOverflow,
  registerViaUi,
  seedParish,
  uniqueEmail,
  type SeededParish,
} from './helpers';

const API = 'http://localhost:3211/api';
const toast = (page: Page, text: string) =>
  page.locator('ol > li[data-state="open"]').filter({ hasText: text }).first();

interface Follower {
  id: string;
  firstName: string;
  email: string;
  name: string;
  page: Page;
}

/** Une paroisse, son administrateur (connecté dans `owner`) et des fidèles (chacun dans son navigateur). */
async function setup(browser: Browser, owner: Page, label: string, firstNames: string[]) {
  await registerViaUi(owner, uniqueEmail(`members-${label}`), 'Admin');
  const parish: SeededParish = await seedParish(owner);
  const followers: Follower[] = [];
  for (const firstName of firstNames) {
    const page = await (await browser.newContext()).newPage();
    const email = uniqueEmail(`members-f-${label}`);
    await registerViaUi(page, email, firstName);
    const me = await (await page.request.get(`${API}/auth/me`)).json();
    expect((await page.request.post(`${API}/parishes/${parish.id}/follow`)).ok()).toBe(true);
    followers.push({ id: me.id, firstName, email, name: `${firstName} Dupont`, page });
  }
  return { parish, followers };
}

const unique = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`;

test.describe('gestion des membres par l’administrateur', () => {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`liste, promotion, responsabilités, retrait (${device})`, async ({ page, browser }) => {
      await page.setViewportSize(viewport);
      const anne = unique('Anne');
      const paul = unique('Paul');
      const { parish, followers } = await setup(browser, page, device, [anne, paul]);
      const [fAnne, fPaul] = followers;

      // Depuis la vue de la paroisse, l'administrateur arrive à l'écran des membres.
      await page.goto(`/dashboard/parishes/${parish.id}`);
      await page.getByRole('link', { name: /^Membres/ }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboard/parishes/${parish.id}/members$`));
      await expect(page.getByRole('heading', { name: 'Membres' })).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);

      // L'administrateur et les deux fidèles ; ni email ni téléphone nulle part.
      await expect(page.getByText('3 membres')).toBeVisible();
      await expect(page.getByRole('combobox', { name: `Statut de ${fAnne.name}` })).toHaveValue(
        'FAITHFUL',
      );
      const text = await page.locator('main').innerText();
      for (const f of followers) expect(text).not.toContain(f.email);
      const listed = await (await page.request.get(`${API}/parishes/${parish.id}/members`)).json();
      expect(JSON.stringify(listed)).not.toMatch(/@|email|phone/i);

      // Recherche par prénom.
      await page.getByLabel('Rechercher un membre').fill(anne);
      await expect(page.getByText('1 membre', { exact: true })).toBeVisible();
      await expect(page.getByRole('combobox', { name: `Statut de ${fPaul.name}` })).toHaveCount(0);
      await page.getByLabel('Rechercher un membre').fill('');
      await expect(page.getByText('3 membres')).toBeVisible();

      // Promotion immédiate : fidèle → paroissien, puis les responsabilités apparaissent.
      await expect(page.getByRole('checkbox', { name: `Lecteur : ${fAnne.name}` })).toHaveCount(0);
      await page
        .getByRole('combobox', { name: `Statut de ${fAnne.name}` })
        .selectOption('PARISHIONER');
      await expect(toast(page, `${fAnne.name} est maintenant Paroissien.`)).toBeVisible();
      await page.getByRole('checkbox', { name: `Lecteur : ${fAnne.name}` }).check();
      await expect(toast(page, `Responsabilités de ${fAnne.name} mises à jour.`)).toBeVisible();
      await page.getByRole('checkbox', { name: `Rédacteur d’annonces : ${fAnne.name}` }).check();
      await expect(
        page.getByRole('checkbox', { name: `Rédacteur d’annonces : ${fAnne.name}` }),
      ).toBeChecked();

      // La base est à jour (rechargement) et la personne y voit ses droits.
      await page.reload();
      await expect(page.getByRole('combobox', { name: `Statut de ${fAnne.name}` })).toHaveValue(
        'PARISHIONER',
      );
      await expect(page.getByRole('checkbox', { name: `Lecteur : ${fAnne.name}` })).toBeChecked();
      const mine = await (
        await fAnne.page.request.get(`${API}/parishes/${parish.id}/membership`)
      ).json();
      expect(mine).toEqual({
        status: 'PARISHIONER',
        duties: expect.arrayContaining(['READER', 'ANNOUNCER']),
      });
      expect(
        (await fAnne.page.request.get(`${API}/parishes/${parish.id}/celebrations`)).status(),
      ).toBe(200);

      // Filtre par statut.
      await page.getByLabel('Filtrer par statut').selectOption('FAITHFUL');
      await expect(page.getByText('1 membre', { exact: true })).toBeVisible();
      await expect(page.getByRole('combobox', { name: `Statut de ${fPaul.name}` })).toBeVisible();
      await page.getByLabel('Filtrer par statut').selectOption('');

      // Rétrogradation : les responsabilités disparaissent avec le statut.
      await page
        .getByRole('combobox', { name: `Statut de ${fAnne.name}` })
        .selectOption('FAITHFUL');
      await expect(toast(page, `${fAnne.name} est maintenant Fidèle.`)).toBeVisible();
      await expect(page.getByRole('checkbox', { name: `Lecteur : ${fAnne.name}` })).toHaveCount(0);
      const demoted = await (
        await fAnne.page.request.get(`${API}/parishes/${parish.id}/membership`)
      ).json();
      expect(demoted).toEqual({ status: 'FAITHFUL', duties: [] });

      // Retrait en deux temps : annuler ne retire rien, confirmer retire.
      await page.getByRole('button', { name: `Retirer ${fPaul.name}` }).click();
      await page.getByRole('button', { name: 'Annuler' }).click();
      await expect(page.getByRole('combobox', { name: `Statut de ${fPaul.name}` })).toBeVisible();
      await page.getByRole('button', { name: `Retirer ${fPaul.name}` }).click();
      await page.getByRole('button', { name: 'Confirmer le retrait' }).click();
      await expect(toast(page, `${fPaul.name} a été retiré de la paroisse.`)).toBeVisible();
      await expect(page.getByRole('combobox', { name: `Statut de ${fPaul.name}` })).toHaveCount(0);
      await expect(page.getByText('2 membres')).toBeVisible();
      const gone = await (
        await fPaul.page.request.get(`${API}/parishes/${parish.id}/membership`)
      ).json();
      expect(gone.status).toBeNull();

      // Le dernier administrateur ne peut pas se rétrograder : l'API refuse, l'écran l'annonce.
      await page.getByRole('combobox', { name: 'Statut de Admin Dupont' }).selectOption('FAITHFUL');
      await expect(toast(page, 'Impossible de modifier ce membre')).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Statut de Admin Dupont' })).toHaveValue(
        'PARISH_ADMIN',
      );

      for (const f of followers) await f.page.context().close();
    });
  }

  test('un fidèle n’a ni le lien ni l’accès à l’écran des membres', async ({ page, browser }) => {
    const { parish, followers } = await setup(browser, page, 'denied', [unique('Luc')]);
    const [luc] = followers;

    await luc.page.goto(`/dashboard/parishes/${parish.id}`);
    await expect(luc.page.getByText('Vous êtes fidèle', { exact: true })).toBeVisible();
    await expect(luc.page.getByRole('link', { name: /^Membres/ })).toHaveCount(0);

    await luc.page.goto(`/dashboard/parishes/${parish.id}/members`);
    await expect(
      luc.page.getByRole('alert').filter({ hasText: 'réservée aux administrateurs' }),
    ).toBeVisible();
    await expect(luc.page.getByLabel('Rechercher un membre')).toHaveCount(0);

    // L'API refuse de toute façon (liste, promotion de soi-même, retrait).
    expect((await luc.page.request.get(`${API}/parishes/${parish.id}/members`)).status()).toBe(403);
    const self = await luc.page.request.patch(`${API}/parishes/${parish.id}/members/${luc.id}`, {
      data: { status: 'PARISH_ADMIN' },
    });
    expect(self.status()).toBe(403);
    expect(
      (await luc.page.request.delete(`${API}/parishes/${parish.id}/members/${luc.id}`)).status(),
    ).toBe(403);
    await luc.page.context().close();
  });

  test('en anglais', async ({ page, browser }) => {
    const { parish, followers } = await setup(browser, page, 'en', [unique('Eve')]);
    await page.request.patch(`${API}/auth/me/locale`, { data: { locale: 'en' } });
    await page.goto(`/dashboard/parishes/${parish.id}/members`);
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByText('2 members')).toBeVisible();
    await page
      .getByRole('combobox', { name: `Status of ${followers[0].name}` })
      .selectOption('PARISHIONER');
    await expect(toast(page, `${followers[0].name} is now Member.`)).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: `Reader: ${followers[0].name}` }),
    ).toBeVisible();
    await followers[0].page.context().close();
  });
});
