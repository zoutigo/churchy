import { expect, test, type Page } from '@playwright/test';
import {
  PASSWORD,
  VIEWPORTS,
  hasHorizontalOverflow,
  loginViaUi,
  registerViaUi,
  uniqueEmail,
} from './helpers';

const API = 'http://localhost:3211/api';

const toast = (page: Page, text: string | RegExp) =>
  page.locator('ol > li[data-state="open"]').filter({ hasText: text });

/** Paroisse + utilisateur connecté, créés par l'API (la session du navigateur sert de cookie). */
async function parishWithUser(page: Page, prefix: string) {
  const email = uniqueEmail(prefix);
  await registerViaUi(page, email);
  const res = await page.request.post(`${API}/parishes`, {
    data: { name: `Paroisse ${prefix} ${Date.now()}`, city: 'Lyon', country: 'France' },
  });
  expect(res.ok()).toBe(true);
  const parish = await res.json();
  return {
    email,
    parishId: parish.id as string,
    listUrl: `/dashboard/parishes/${parish.id}/contents`,
  };
}

async function addContent(page: Page, title: string, body: string) {
  await page.getByRole('button', { name: '+ Ajouter un contenu' }).click();
  await page.getByLabel('Titre').fill(title);
  await page.getByLabel('Contenu', { exact: true }).fill(body);
  await page.getByRole('button', { name: 'Ajouter le contenu' }).click();
}

test.describe('bibliothèque de contenus : parcours complet avec retours (toasts)', () => {
  test('crée une paroisse puis un contenu, le lit, le modifie et le supprime — un toast à chaque étape', async ({
    page,
  }) => {
    await registerViaUi(page, uniqueEmail('lib'));
    const name = `Sainte Toast ${Date.now()}`;

    // Paroisse : toast de succès.
    await page.goto('/dashboard/parishes');
    await page.getByRole('button', { name: '+ Nouvelle paroisse' }).click();
    await page.getByLabel('Nom de la paroisse').fill(name);
    await page.getByLabel('Pays', { exact: true }).selectOption('France');
    await page.getByLabel('Ville', { exact: true }).fill('Nantes');
    await page.getByRole('button', { name: 'Créer la paroisse' }).click();
    await expect(toast(page, 'Paroisse créée')).toBeVisible();
    await page.getByRole('link', { name: new RegExp(name) }).click();
    await page.waitForURL(/\/dashboard\/parishes\/[^/]+$/);
    const parishId = page.url().split('/').pop() as string;

    // Contenu : création.
    await page.goto(`/dashboard/parishes/${parishId}/contents`);
    await expect(page.getByText("Aucun contenu pour l'instant.")).toBeVisible();
    await addContent(page, 'Je vous salue Marie', 'Pleine de grâce, le Seigneur est avec vous.');
    await expect(toast(page, 'Contenu ajouté')).toBeVisible();
    await expect(page.getByRole('link', { name: /Je vous salue Marie/ })).toBeVisible();

    // Lecture.
    await page.getByRole('link', { name: /Je vous salue Marie/ }).click();
    await expect(page.getByRole('heading', { name: 'Je vous salue Marie' })).toBeVisible();
    await expect(page.getByText('Pleine de grâce, le Seigneur est avec vous.')).toBeVisible();
    await expect(page.getByText(/Ajouté le/)).toBeVisible();

    // Modification.
    await page.getByRole('button', { name: 'Modifier' }).click();
    await expect(page.getByLabel('Titre')).toHaveValue('Je vous salue Marie');
    await page.getByLabel('Titre').fill('Ave Maria');
    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
    await expect(toast(page, 'Contenu modifié')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ave Maria' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Ave Maria' })).toBeVisible();

    // Suppression en deux temps, retour à la liste.
    await page.getByRole('button', { name: 'Supprimer Ave Maria' }).click();
    await page.getByRole('button', { name: 'Confirmer la suppression de Ave Maria' }).click();
    await expect(toast(page, 'Contenu supprimé')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/dashboard/parishes/${parishId}/contents$`));
    await expect(page.getByText("Aucun contenu pour l'instant.")).toBeVisible();
  });

  test('le toast disparaît tout seul', async ({ page }) => {
    const { listUrl } = await parishWithUser(page, 'autoclose');
    await page.goto(listUrl);
    await addContent(page, 'Éphémère', 'Texte');
    await expect(toast(page, 'Contenu ajouté')).toBeVisible();
    await expect(toast(page, 'Contenu ajouté')).toBeHidden({ timeout: 10_000 });
  });
});

test.describe('erreurs : validation du formulaire, validation du serveur, panne', () => {
  test('validation Zod côté formulaire : messages sous les champs, aucune requête envoyée', async ({
    page,
  }) => {
    const { listUrl } = await parishWithUser(page, 'zod');
    await page.goto(listUrl);
    await page.getByRole('button', { name: '+ Ajouter un contenu' }).click();
    let posts = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/contents')) posts++;
    });
    await page.getByLabel('Titre').fill('a');
    await page.getByLabel('Titre').fill('');
    await page.getByRole('button', { name: 'Ajouter le contenu' }).click();
    await expect(page.getByText('Titre requis')).toBeVisible();
    await expect(page.getByText('Contenu requis')).toBeVisible();
    await expect(page.getByLabel('Titre')).toHaveAttribute('aria-invalid', 'true');
    expect(posts).toBe(0);
    await expect(toast(page, 'Contenu ajouté')).toHaveCount(0);

    // Corriger les champs fait disparaître les messages.
    await page.getByLabel('Titre').fill('Corrigé');
    await expect(page.getByText('Titre requis')).toBeHidden();
  });

  test('validation Zod côté serveur (400) : message sous le bon champ + toast d’erreur, saisie conservée', async ({
    page,
  }) => {
    const { listUrl } = await parishWithUser(page, 'zod400');
    await page.goto(listUrl);
    await page.route('**/api/parishes/*/contents', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 400,
          message: {
            formErrors: [],
            fieldErrors: { title: ['Ce titre est refusé par le serveur'] },
          },
        }),
      });
    });
    await addContent(page, 'Titre refusé', 'Texte saisi');
    await expect(page.getByText('Ce titre est refusé par le serveur')).toBeVisible();
    await expect(toast(page, 'Création impossible')).toBeVisible();
    await expect(page.getByLabel('Titre')).toHaveValue('Titre refusé');
    await expect(page.getByLabel('Contenu', { exact: true })).toContainText('Texte saisi');
    await expect(toast(page, 'Contenu ajouté')).toHaveCount(0);
  });

  test('erreur serveur 500 : message général + toast, puis réessayer réussit', async ({ page }) => {
    const { listUrl } = await parishWithUser(page, 'e500');
    await page.goto(listUrl);
    let fail = true;
    await page.route('**/api/parishes/*/contents', async (route) => {
      if (route.request().method() !== 'POST' || !fail) return route.fallback();
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, message: 'Internal server error' }),
      });
    });
    await addContent(page, 'Réessai', 'Texte');
    await expect(page.getByText('Internal server error').first()).toBeVisible();
    await expect(toast(page, 'Création impossible')).toBeVisible();

    fail = false;
    await page.getByRole('button', { name: 'Ajouter le contenu' }).click();
    await expect(toast(page, 'Contenu ajouté')).toBeVisible();
    await expect(page.getByRole('link', { name: /Réessai/ })).toBeVisible();
  });

  test('serveur injoignable : message explicite, bouton à nouveau actif', async ({ page }) => {
    const { listUrl } = await parishWithUser(page, 'offline');
    await page.goto(listUrl);
    await page.route('**/api/parishes/*/contents', (route) =>
      route.request().method() === 'POST' ? route.abort('connectionrefused') : route.fallback(),
    );
    await addContent(page, 'Hors ligne', 'Texte');
    await expect(page.getByText(/Impossible de joindre le serveur/).first()).toBeVisible();
    await expect(toast(page, 'Création impossible')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter le contenu' })).toBeEnabled();
  });

  test('échec de la suppression : toast d’erreur, on reste sur la page et le contenu existe encore', async ({
    page,
  }) => {
    const { listUrl } = await parishWithUser(page, 'delfail');
    await page.goto(listUrl);
    await addContent(page, 'À garder', 'Texte');
    await page.getByRole('link', { name: /À garder/ }).click();
    await page.route('**/api/contents/*', (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              statusCode: 403,
              message: { message: 'Seul le créateur peut supprimer ce contenu' },
            }),
          })
        : route.fallback(),
    );
    await page.getByRole('button', { name: 'Supprimer À garder' }).click();
    await page.getByRole('button', { name: 'Confirmer la suppression de À garder' }).click();
    await expect(toast(page, 'Suppression impossible')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'À garder' })).toBeVisible();
    await page.unroute('**/api/contents/*');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'À garder' })).toBeVisible();
  });

  test('contenu introuvable : message et lien de retour', async ({ page }) => {
    const { listUrl } = await parishWithUser(page, 'notfound');
    await page.goto(`${listUrl}/inexistant`);
    await expect(page.getByText('Ressource introuvable')).toBeVisible();
    await page.getByRole('link', { name: 'Retour à la bibliothèque' }).click();
    await expect(page).toHaveURL(new RegExp(`${listUrl}$`));
  });
});

test.describe('bibliothèque fournie : recherche, filtre, pagination, droits', () => {
  const TYPES = [
    'SONG',
    'PSALM',
    'GOSPEL',
    'READING',
    'PRAYER',
    'UNIVERSAL_PRAYER',
    'ANNOUNCEMENT',
    'FREE_TEXT',
  ];

  async function seed(page: Page, parishId: string, perType: number) {
    for (const type of TYPES) {
      for (let i = 1; i <= perType; i++) {
        const res = await page.request.post(`${API}/parishes/${parishId}/contents`, {
          data: { title: `${type} numéro ${i}`, type, body: `<p>Texte ${type} ${i}</p>` },
        });
        expect(res.ok()).toBe(true);
      }
    }
  }

  test('20 contenus de chaque type : pagination par 24, filtre par type, recherche', async ({
    page,
  }) => {
    const { parishId, listUrl } = await parishWithUser(page, 'seed');
    await seed(page, parishId, 20);
    await page.goto(listUrl);

    await expect(page.getByRole('status').filter({ hasText: '160 contenus' })).toBeVisible();
    await expect(page.getByRole('link', { name: /numéro/ })).toHaveCount(24);
    await page.getByRole('button', { name: /Afficher plus \(136 restants\)/ }).click();
    await expect(page.getByRole('link', { name: /numéro/ })).toHaveCount(48);

    await page.getByLabel('Filtrer par type').selectOption('PSALM');
    await expect(page.getByRole('status').filter({ hasText: '20 contenus sur 160' })).toBeVisible();
    await expect(page.getByRole('link', { name: /numéro/ })).toHaveCount(20);
    await expect(page.getByRole('link', { name: /PSALM numéro 20/ })).toBeVisible();

    await page.getByLabel('Rechercher un contenu').fill('numéro 17');
    await expect(page.getByRole('link', { name: /numéro/ })).toHaveCount(1);
    await page.getByLabel('Rechercher un contenu').fill('zzzzz');
    await expect(page.getByText('Aucun contenu ne correspond à votre recherche.')).toBeVisible();
  });

  test('un autre membre de la paroisse peut lire mais ni modifier ni supprimer', async ({
    page,
    browser,
  }) => {
    const { parishId, listUrl } = await parishWithUser(page, 'owner');
    const res = await page.request.post(`${API}/parishes/${parishId}/contents`, {
      data: { title: 'Texte du propriétaire', type: 'PRAYER', body: '<p>Amen</p>' },
    });
    const content = await res.json();

    const otherEmail = uniqueEmail('member');
    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    await registerViaUi(other, otherEmail);
    // L'autre compte devient fidèle, puis l'administrateur le fait administrateur à son tour.
    expect((await other.request.post(`${API}/parishes/${parishId}/follow`)).ok()).toBe(true);
    const otherId = (await (await other.request.get(`${API}/auth/me`)).json()).id;
    const promote = await page.request.patch(`${API}/parishes/${parishId}/members/${otherId}`, {
      data: { status: 'PARISH_ADMIN' },
    });
    expect(promote.ok()).toBe(true);

    await other.goto(`${listUrl}/${content.id}`);
    await expect(other.getByRole('heading', { name: 'Texte du propriétaire' })).toBeVisible();
    await expect(other.getByRole('button', { name: 'Modifier' })).toHaveCount(0);
    await expect(other.getByRole('button', { name: /Supprimer/ })).toHaveCount(0);
    await expect(other.getByText(/Seul l’auteur/)).toBeVisible();
    await ctx.close();
  });
});

test.describe('bibliothèque : mobile, tablette, desktop', () => {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`liste, lecture, formulaire et toast sans débordement (${device})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const { parishId, listUrl } = await parishWithUser(page, `rwd-${device}`);
      for (const [i, type] of ['SONG', 'PRAYER', 'GOSPEL'].entries()) {
        await page.request.post(`${API}/parishes/${parishId}/contents`, {
          data: {
            title: `Un titre volontairement très long pour vérifier la troncature ${i} `.repeat(2),
            type,
            body: `<p>${'Texte long '.repeat(80)}</p>`,
          },
        });
      }

      await page.goto(listUrl);
      await expect(page.getByLabel('Rechercher un contenu')).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);

      // Zone de clic confortable au doigt sur mobile.
      const first = page.getByRole('link', { name: /Un titre/ }).first();
      const box = await first.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      const columns = await page
        .getByRole('link', { name: /Un titre/ })
        .evaluateAll(
          (els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size,
        );
      if (viewport.width < 768) expect(columns).toBe(1);
      else expect(columns).toBeGreaterThanOrEqual(2);

      await first.click();
      await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);

      await page.getByRole('button', { name: 'Modifier' }).click();
      await expect(
        page.getByRole('button', { name: 'Enregistrer les modifications' }),
      ).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
      const t = toast(page, 'Contenu modifié');
      await expect(t).toBeVisible();
      // le toast (une fois son animation d'entrée finie) reste entièrement dans l'écran
      await expect
        .poll(async () => {
          const tb = await t.boundingBox();
          return !!tb && tb.x >= 0 && tb.x + tb.width <= viewport.width + 1;
        })
        .toBe(true);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test('connexion refusée : message d’erreur dans le formulaire ET toast', async ({ page }) => {
  await loginViaUi(page, 'inconnu@e2e.test', PASSWORD);
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(toast(page, /.+/).first()).toBeVisible();
});
