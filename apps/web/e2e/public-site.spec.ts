import { expect, test, type Page } from '@playwright/test';
import {
  VIEWPORTS,
  hasHorizontalOverflow,
  latestContactJob,
  registerViaUi,
  seedParish,
  uniqueEmail,
  type SeededParish,
} from './helpers';

test.describe('site public', () => {
  let parish: SeededParish;

  // Une seule paroisse préparée pour tous les scénarios en lecture seule.
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await registerViaUi(page, uniqueEmail('public-seed'));
    parish = await seedParish(page);
    await page.close();
  });

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${device} (${viewport.width}×${viewport.height})`, () => {
      test.use({ viewport });

      test('landing → recherche → résultats → paroisse → messes → messe', async ({ page }) => {
        await page.goto('/');
        await expect(
          page.getByRole('heading', { level: 1, name: 'Votre paroisse, à portée de main' }),
        ).toBeVisible();

        // La recherche est le premier élément interactif et tient dans le premier écran.
        const search = page.getByRole('searchbox').first();
        await expect(search).toBeVisible();
        const box = await search.boundingBox();
        expect(box!.y + box!.height).toBeLessThan(viewport.height);
        await expect(search).toHaveAttribute(
          'placeholder',
          'Rechercher une paroisse, une ville ou un quartier',
        );

        await search.fill(parish.token.toLowerCase());
        await page.getByRole('button', { name: 'Rechercher' }).first().click();
        await expect(page).toHaveURL(/\/fr\/paroisses\?q=/);

        const card = page.getByRole('article').filter({ hasText: parish.name });
        await expect(card).toBeVisible();
        await expect(card).toContainText('Croix-Rousse, Lyon');
        await expect(card).toContainText('Église Saint-Pierre');
        // La prochaine messe visible est la messe annoncée (le brouillon est caché).
        await expect(card).toContainText('Prochaine messe');
        await expect(card).toContainText('Feuille en préparation');

        await card.getByRole('link', { name: 'Voir la paroisse' }).click();
        await expect(page).toHaveURL(`/fr/paroisses/${parish.id}`);
        await expect(page.getByRole('heading', { level: 1, name: parish.name })).toBeVisible();

        await page
          .getByRole('navigation', { name: 'Pages de la paroisse' })
          .getByRole('link', { name: 'Messes' })
          .click();
        await expect(page).toHaveURL(`/fr/paroisses/${parish.id}/messes`);
        await expect(page.getByText('Messe brouillon cachée')).toHaveCount(0);
        await expect(page.getByText('Feuille disponible')).toBeVisible();
        await expect(page.getByText('Feuille en préparation')).toBeVisible();

        await page.getByRole('link', { name: /Messe publiée/ }).click();
        await expect(page).toHaveURL(`/fr/paroisses/${parish.id}/messes/${parish.publishedId}`);
        await expect(page.getByRole('heading', { name: 'Messe publiée' })).toBeVisible();
        await expect(page.getByText('Feuille disponible')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Déroulement' })).toBeVisible();
      });

      test('page de paroisse : identité, messes, annonces, activités, infos pratiques', async ({
        page,
      }) => {
        await page.goto(`/fr/paroisses/${parish.id}`);
        await expect(page.getByText('Une paroisse accueillante.')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Prochaines messes' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Changement d’horaire' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Groupe de jeunes' })).toBeVisible();

        // Les infos pratiques s'affichent une seule fois : colonne de droite (desktop) ou dans la page
        // (la copie masquée par CSS est ignorée par getByRole).
        await expect(page.getByRole('heading', { name: 'Informations pratiques' })).toHaveCount(1);
        await expect(page.getByRole('link', { name: '04 00 00 00 00' })).toHaveAttribute(
          'href',
          'tel:0400000000',
        );
      });

      test('annonces et activités', async ({ page }) => {
        await page.goto(`/fr/paroisses/${parish.id}/annonces`);
        await expect(page.getByText('La messe du dimanche est avancée')).toBeVisible();
        await expect(page.getByText(/commence à 9 h/)).toBeVisible();

        await page.goto(`/fr/paroisses/${parish.id}/activites`);
        await expect(page.getByRole('heading', { name: 'Groupe de jeunes' })).toBeVisible();
        await expect(page.getByText('Salle paroissiale')).toBeVisible();
      });

      test('la messe annoncée est visible sans déroulement', async ({ page }) => {
        await page.goto(`/fr/paroisses/${parish.id}/messes/${parish.announcedId}`);
        await expect(page.getByRole('heading', { name: 'Messe annoncée' })).toBeVisible();
        await expect(page.getByText('Feuille en préparation')).toBeVisible();
        await expect(page.getByText(/La paroisse prépare la feuille/)).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Déroulement' })).toHaveCount(0);
      });

      test('aucun débordement horizontal sur les pages publiques', async ({ page }) => {
        const paths = [
          '/fr',
          '/fr/paroisses',
          `/fr/paroisses/${parish.id}`,
          `/fr/paroisses/${parish.id}/messes`,
          `/fr/paroisses/${parish.id}/annonces`,
          `/fr/paroisses/${parish.id}/activites`,
          `/fr/paroisses/${parish.id}/messes/${parish.publishedId}`,
          '/fr/pour-les-paroisses',
          '/fr/a-propos',
          '/fr/contact',
          '/fr/mentions-legales',
        ];
        for (const path of paths) {
          await page.goto(path);
          expect(await hasHorizontalOverflow(page), `débordement sur ${path}`).toBe(false);
        }
      });

      test('en-tête : liens en ligne dès la tablette, menu repliable sur mobile', async ({
        page,
      }) => {
        await page.goto('/');
        const header = page.locator('header');
        const menuButton = header.getByRole('button', { name: 'Ouvrir le menu' });
        if (viewport.width < 768) {
          await expect(menuButton).toBeVisible();
          await expect(header.getByRole('link', { name: 'Connexion' })).toBeHidden();
          await menuButton.click();
          await expect(header.getByRole('link', { name: 'Pour les paroisses' })).toBeVisible();
          await expect(header.getByRole('link', { name: 'Connexion' })).toBeVisible();
          await header.getByRole('link', { name: 'Connexion' }).click();
          await expect(page).toHaveURL(/\/fr\/connexion$/);
        } else {
          await expect(menuButton).toBeHidden();
          await expect(header.getByRole('link', { name: 'Pour les paroisses' })).toBeVisible();
          await expect(header.getByRole('link', { name: 'Connexion' })).toBeVisible();
          await expect(header.getByRole('link', { name: 'Créer un compte' })).toHaveCount(0);
        }
      });

      test('mise en page adaptée : fiche pratique en colonne latérale uniquement sur desktop', async ({
        page,
      }) => {
        await page.goto(`/fr/paroisses/${parish.id}`);
        const aside = page.locator('aside');
        if (viewport.width >= 1024) await expect(aside).toBeVisible();
        else await expect(aside).toBeHidden();
      });
    });
  }

  test('recherche : insensible à la casse, par ville, sans résultat et pagination d’URL', async ({
    page,
  }) => {
    await page.goto(`/fr/paroisses?q=${encodeURIComponent(parish.token.toUpperCase())}`);
    await expect(page.getByRole('article').filter({ hasText: parish.name })).toBeVisible();

    await page.goto(`/fr/paroisses?q=${encodeURIComponent('croix-rousse lyon ' + parish.token)}`);
    await expect(page.getByRole('article').filter({ hasText: parish.name })).toBeVisible();

    await page.goto('/fr/paroisses?q=aucune-paroisse-avec-ce-nom-xyz');
    await expect(page.getByText('Aucune paroisse ne correspond à votre recherche')).toBeVisible();
    await page.getByRole('link', { name: 'Voir toutes les paroisses' }).click();
    await expect(page).toHaveURL(/\/fr\/paroisses$/);
    await expect(page.getByRole('heading', { name: 'Toutes les paroisses' })).toBeVisible();

    // Paramètres hors bornes : pas d'erreur serveur.
    const res = await page.goto('/fr/paroisses?page=-4&q=' + 'x'.repeat(300));
    expect(res!.status()).toBe(200);
  });

  test('une paroisse ou une messe inconnue répond 404 avec un message clair', async ({ page }) => {
    const res = await page.goto('/fr/paroisses/paroisse-qui-nexiste-pas');
    expect(res!.status()).toBe(404);
    await expect(page.getByText('Paroisse introuvable')).toBeVisible();

    const res2 = await page.goto(`/fr/paroisses/${parish.id}/messes/inconnue`);
    expect(res2!.status()).toBe(404);

    // Une messe existante ne s'ouvre pas sous l'URL d'une autre paroisse.
    const res3 = await page.goto(`/fr/paroisses/autre-paroisse/messes/${parish.publishedId}`);
    expect(res3!.status()).toBe(404);
  });

  test('pages d’information : pour les paroisses, à propos, textes légaux, pied de page', async ({
    page,
  }) => {
    await page.goto('/fr/pour-les-paroisses');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('depuis un seul espace');
    await expect(
      page.getByRole('link', { name: 'Créer le compte de ma paroisse' }),
    ).toHaveAttribute('href', '/fr/inscription');

    await page.goto('/fr/a-propos');
    await expect(page.getByRole('heading', { name: 'À propos de Churchy' })).toBeVisible();

    for (const [path, title] of [
      ['/fr/conditions-generales', 'Conditions générales d’utilisation'],
      ['/fr/confidentialite', 'Politique de confidentialité'],
      ['/fr/mentions-legales', 'Mentions légales'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole('note')).toContainText('Version provisoire');
      await expect(page.getByRole('navigation', { name: 'Sommaire' })).toBeVisible();
      expect(await page.getByRole('heading', { level: 2 }).count()).toBeGreaterThanOrEqual(8);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    }

    // Le sommaire mène à la section demandée.
    await page.goto('/fr/confidentialite');
    await page
      .getByRole('navigation', { name: 'Sommaire' })
      .getByRole('link', { name: 'Vos droits' })
      .click();
    await expect(page).toHaveURL(/#section-\d+$/);
    await expect(page.getByRole('heading', { level: 2, name: /Vos droits/ })).toBeInViewport();

    // Même document en anglais.
    await page.goto('/en/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /Your rights/ })).toBeVisible();
    await page.goto('/en/terms');
    await expect(page.getByRole('heading', { level: 2, name: /Liability/ })).toBeVisible();
    await page.goto('/en/legal-notice');
    await expect(page.getByRole('heading', { level: 2, name: /Host/ })).toBeVisible();

    await page.goto('/fr');
    const footer = page.locator('footer');
    for (const label of [
      'Trouver une paroisse',
      'Pour les paroisses',
      'Connexion',
      'À propos',
      'Contact',
      'Conditions générales',
      'Politique de confidentialité',
      'Mentions légales',
    ]) {
      await expect(footer.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('landing : sections attendues et second champ de recherche', async ({ page }) => {
    await page.goto('/');
    for (const t of ['Messes', 'Feuilles de célébration', 'Annonces', 'Activités']) {
      await expect(page.getByRole('heading', { level: 3, name: t })).toBeVisible();
    }
    await expect(
      page.getByRole('heading', {
        name: 'Préparez votre messe avant même d’arriver à l’église.',
      }),
    ).toBeVisible();
    await expect(page.getByLabel('Exemple de feuille de célébration').first()).toContainText(
      'Feuille disponible',
    );
    await expect(
      page.getByRole('heading', { name: 'Vous représentez une paroisse ?' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Découvrir Churchy pour les paroisses' }).click();
    await expect(page).toHaveURL(/\/fr\/pour-les-paroisses$/);

    await page.goto('/');
    const final = page.getByRole('heading', { name: 'Trouvez votre paroisse sur Churchy' });
    await expect(final).toBeVisible();
    await page.locator('#final-search').fill('Lyon');
    await page.locator('#final-search').press('Enter');
    await expect(page).toHaveURL(/\/fr\/paroisses\?q=Lyon$/);
  });

  test('la recherche fonctionne aussi sans JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('searchbox').first().fill(parish.token);
    await page.getByRole('button', { name: 'Rechercher' }).first().click();
    await expect(page.getByRole('article').filter({ hasText: parish.name })).toBeVisible();
    await context.close();
  });
});

test.describe('contact', () => {
  async function fill(
    page: Page,
    email: string,
    message = 'Bonjour, nous voulons utiliser Churchy.',
  ) {
    await page.getByLabel('Nom', { exact: true }).fill('Marie Dupont');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Message').fill(message);
  }

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test(`envoi d’un message (${device})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const email = uniqueEmail('contact');
      await page.goto('/fr/contact?sujet=PARISH');
      await expect(page.getByRole('combobox')).toContainText('Je représente une paroisse');
      await fill(page, email);
      await page.getByRole('button', { name: 'Envoyer le message' }).click();
      await expect(page.getByText('Message envoyé')).toBeVisible();

      const job = await latestContactJob(email);
      expect(job).toMatchObject({ name: 'Marie Dupont', topic: 'PARISH', email });
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }

  test('choisit un autre sujet, valide les champs et ignore les robots', async ({ page }) => {
    await page.goto('/fr/contact');
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByText('Nom requis')).toBeVisible();
    await expect(page.getByText('Email invalide')).toBeVisible();
    await expect(page.getByText('Message trop court (min 10 caractères)')).toBeVisible();

    const email = uniqueEmail('contact-pb');
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Signaler un problème' }).click();
    await fill(page, email);
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByText('Message envoyé')).toBeVisible();
    expect(await latestContactJob(email)).toMatchObject({ topic: 'PROBLEM' });

    // Robot : il remplit le champ invisible → le message est accepté mais n'est pas transmis.
    const botEmail = uniqueEmail('bot');
    await page.goto('/fr/contact');
    await fill(page, botEmail);
    await page.locator('#contact-website').fill('http://spam.example', { force: true });
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByText('Message envoyé')).toBeVisible();
    // Aucun job n'est enfilé (la recherche dans la file dure quelques secondes avant d'abandonner).
    expect(await latestContactJob(botEmail)).toBeNull();
  });
});

test.describe('référencement', () => {
  test('sitemap.xml : pages statiques et paroisses, dans les deux langues avec hreflang', async ({
    request,
    browser,
  }) => {
    const page = await browser.newPage();
    await registerViaUi(page, uniqueEmail('sitemap'));
    const seeded = await seedParish(page);
    await page.close();

    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBe(true);
    const xml = await res.text();
    for (const path of [
      '/fr',
      '/en',
      '/fr/conditions-generales',
      '/en/terms',
      '/fr/mentions-legales',
      '/en/legal-notice',
      `/fr/paroisses/${seeded.id}/messes`,
      `/en/parishes/${seeded.id}/masses`,
    ]) {
      expect(xml, path).toContain(`${path}</loc>`);
    }
    expect(xml).toContain('hreflang="en"');
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).not.toContain('/dashboard');
    expect(xml).not.toContain('/connexion');
  });

  test('robots.txt : exclut l’espace privé et annonce le sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBe(true);
    const txt = await res.text();
    expect(txt).toMatch(/Disallow: \/dashboard/);
    expect(txt).toMatch(/Disallow: \/api\//);
    expect(txt).toMatch(/Disallow: \/fr\/connexion/);
    expect(txt).toMatch(/Disallow: \/en\/login/);
    expect(txt).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });
});
