import { expect, test } from '@playwright/test';
import {
  PASSWORD,
  PIN,
  VIEWPORTS,
  expectNoHorizontalScroll,
  latestEmailLink,
  loginPhoneViaUi,
  loginViaUi,
  logoutViaUi,
  makeSuperAdmin,
  registerPhoneViaUi,
  registerViaUi,
  uniqueEmail,
  uniquePhone,
} from './helpers';

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

/** Pilote le sélecteur de menu utilisateur (en-tête du tableau de bord). */
const openUserMenu = async (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Menu utilisateur' }).click();

const goToSecurity = async (page: import('@playwright/test').Page) => {
  await page.goto('/dashboard/security');
  await expect(page.getByRole('heading', { name: 'Sécurité du compte' })).toBeVisible();
};

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`téléphone + PIN (${device})`, () => {
    test.use({ viewport });

    test('inscription, déconnexion puis connexion par téléphone', async ({ page }) => {
      const phone = await registerPhoneViaUi(page);
      // Compte sans email : rien à confirmer, aucune bannière.
      await expect(page.getByText('Confirmez votre adresse email')).toHaveCount(0);
      await openUserMenu(page);
      await expect(page.getByText(/\+237 6 \d\d \d\d \d\d \d\d/)).toBeVisible();
      await expect(page.getByText('Email non confirmé')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await logoutViaUi(page);

      await loginPhoneViaUi(page, phone);
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('la connexion par email et par téléphone cohabitent sur la même page', async ({
      page,
    }) => {
      await page.goto('/fr/connexion');
      await expect(page.getByRole('tab', { name: 'Email' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.getByLabel('Email')).toBeVisible();
      await page.getByRole('tab', { name: 'Téléphone' }).click();
      await expect(page.getByLabel('Numéro de téléphone')).toBeVisible();
      await expect(page.getByLabel('Email')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'PIN oublié ?' })).toBeVisible();
      await page.getByRole('tab', { name: 'Email' }).click();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test('formulaires : pas de défilement horizontal, champs et boutons faciles à toucher', async ({
      page,
    }) => {
      for (const path of ['/fr/connexion', '/fr/inscription']) {
        await page.goto(path);
        await page.getByRole('tab', { name: 'Téléphone' }).click();
        await expectNoHorizontalScroll(page);
        const submit = page.getByRole('button', { name: /Se connecter|Créer mon compte/ });
        expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(40);
        expect(
          (await page.getByRole('tab', { name: 'Téléphone' }).boundingBox())!.height,
        ).toBeGreaterThanOrEqual(40);
        expect((await page.getByLabel('Pays').boundingBox())!.height).toBeGreaterThanOrEqual(40);
      }
    });

    test('inscription : validations (PIN simple, PIN différents, numéro incomplet)', async ({
      page,
    }) => {
      await page.goto('/fr/inscription');
      await page.getByRole('tab', { name: 'Téléphone' }).click();
      await page.getByLabel('Prénom').fill('Marie');
      await page.getByLabel('Nom', { exact: true }).fill('Ngono');
      await page.getByLabel('Numéro de téléphone').fill('6771');
      await page.getByLabel('PIN', { exact: true }).fill('123456');
      await page.getByLabel('Confirmer le PIN').fill('654321');
      await page.getByRole('button', { name: 'Créer mon compte' }).click();

      await expect(page.getByText('Numéro de téléphone invalide')).toBeVisible();
      await expect(page.getByText(/PIN trop simple/)).toBeVisible();
      await expect(page.getByText('Les PIN ne correspondent pas')).toBeVisible();
      await expect(page).toHaveURL(/\/inscription$/);
    });

    test('le PIN est masqué, affichable, et n’accepte que des chiffres', async ({ page }) => {
      await page.goto('/fr/connexion');
      await page.getByRole('tab', { name: 'Téléphone' }).click();
      const pin = page.getByLabel('PIN', { exact: true });
      await pin.pressSequentially('48a9-1x5 77');
      await expect(pin).toHaveValue('489157'.slice(0, 6) === '489157' ? '489157' : '');
      await expect(pin).toHaveAttribute('type', 'password');
      await page.getByRole('button', { name: 'Afficher le PIN' }).click();
      await expect(pin).toHaveAttribute('type', 'text');
    });

    test('numéro déjà inscrit : erreur claire', async ({ page, browser }) => {
      const phone = await registerPhoneViaUi(page);
      const other = await browser.newContext({ viewport });
      const page2 = await other.newPage();
      await page2.goto('/fr/inscription');
      await page2.getByRole('tab', { name: 'Téléphone' }).click();
      await page2.getByLabel('Prénom').fill('Autre');
      await page2.getByLabel('Nom', { exact: true }).fill('Personne');
      await page2.getByLabel('Numéro de téléphone').fill(phone.national);
      await page2.getByLabel('PIN', { exact: true }).fill('739104');
      await page2.getByLabel('Confirmer le PIN').fill('739104');
      await page2.getByRole('button', { name: 'Créer mon compte' }).click();
      await expect(page2.getByText('Ce numéro est déjà utilisé').first()).toBeVisible();
      await other.close();
    });

    test('mauvais PIN, puis verrouillage après 5 essais même avec le bon PIN', async ({ page }) => {
      const phone = await registerPhoneViaUi(page);
      await logoutViaUi(page);

      await loginPhoneViaUi(page, phone, '000001');
      await expect(
        page.getByRole('alert').filter({ hasText: 'Identifiants invalides' }),
      ).toBeVisible();
      for (let i = 0; i < 4; i += 1) {
        await page.getByLabel('PIN', { exact: true }).fill('000001');
        await page.getByRole('button', { name: 'Se connecter' }).click();
      }
      await page.getByLabel('PIN', { exact: true }).fill(PIN);
      await page.getByRole('button', { name: 'Se connecter' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Trop de tentatives' })).toBeVisible();
      await expect(page).toHaveURL(/\/connexion/);
    });

    test('redirige vers la page demandée après connexion par téléphone', async ({ page }) => {
      const phone = await registerPhoneViaUi(page);
      await logoutViaUi(page);
      await loginPhoneViaUi(page, phone, PIN, '/dashboard/security');
      await expect(page).toHaveURL(/\/dashboard\/security$/);
    });
  });

  test.describe(`sécurité du compte (${device})`, () => {
    test.use({ viewport });

    test('page accessible depuis la navigation, sans défilement horizontal', async ({ page }) => {
      await registerViaUi(page, uniqueEmail('secnav'));
      const link =
        viewport.width < 768
          ? page
              .getByRole('navigation', { name: 'Navigation du tableau de bord' })
              .getByRole('link', { name: 'Sécurité' })
          : page.getByRole('complementary').getByRole('link', { name: 'Sécurité' });
      await link.click();
      await expect(page).toHaveURL(/\/dashboard\/security$/);
      await expect(page.getByTestId('method-password')).toHaveAttribute('data-active', 'true');
      await expect(page.getByTestId('method-pin')).toHaveAttribute('data-active', 'false');
      await expectNoHorizontalScroll(page);
    });

    test('compte par téléphone : ajoute un email (preuve par PIN), crée un mot de passe, se connecte par email', async ({
      page,
    }) => {
      await registerPhoneViaUi(page);
      await goToSecurity(page);
      await expect(page.getByText('Ajoutez d’abord une adresse email')).toBeVisible();

      const email = uniqueEmail('phone2mail');
      const card = page.getByTestId('card-email-password');
      await card.getByLabel('Adresse email').fill(email);
      await card.getByLabel('PIN actuel').fill(PIN);
      await card.getByRole('button', { name: 'Ajouter l’email' }).click();
      await expect(page.getByText('Email ajouté', { exact: true })).toBeVisible();
      await expect(card.getByText(email)).toBeVisible();
      await expect(card.getByText('à confirmer')).toBeVisible();

      await card.getByLabel('PIN actuel').fill(PIN);
      await card.getByLabel('Mot de passe', { exact: true }).fill('nouveau-mdp-123');
      await card.getByLabel('Confirmer le mot de passe').fill('nouveau-mdp-123');
      await card.getByRole('button', { name: 'Créer le mot de passe' }).click();
      await expect(page.getByText('Mot de passe créé', { exact: true })).toBeVisible();
      await expect(page.getByTestId('method-password')).toHaveAttribute('data-active', 'true');
      await expectNoHorizontalScroll(page);

      await logoutViaUi(page);
      await loginViaUi(page, email, 'nouveau-mdp-123');
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('compte email : active le téléphone (preuve par mot de passe), puis se connecte par téléphone', async ({
      page,
    }) => {
      await registerViaUi(page, uniqueEmail('mail2phone'));
      await goToSecurity(page);
      const phone = uniquePhone();
      const card = page.getByTestId('card-phone-pin');
      await card.getByLabel('Numéro de téléphone').fill(phone.national);
      await card.getByLabel('PIN', { exact: true }).fill(PIN);
      await card.getByLabel('Confirmer le PIN').fill(PIN);
      await card.getByLabel('Mot de passe actuel').fill('mauvais-mdp-1');
      await card.getByRole('button', { name: 'Activer la connexion par téléphone' }).click();
      await expect(card.getByRole('alert')).toContainText('incorrect');

      await card.getByLabel('Mot de passe actuel').fill(PASSWORD);
      await card.getByRole('button', { name: 'Activer la connexion par téléphone' }).click();
      await expect(
        page.getByText('Connexion par téléphone activée', { exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId('method-pin')).toHaveAttribute('data-active', 'true');

      await logoutViaUi(page);
      await loginPhoneViaUi(page, phone);
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('change le PIN : l’ancien ne fonctionne plus, le nouveau oui', async ({ page }) => {
      const phone = await registerPhoneViaUi(page);
      await goToSecurity(page);
      const card = page.getByTestId('card-phone-pin');
      await card.getByLabel('PIN actuel').fill('000001');
      await card.getByLabel('Nouveau PIN').fill('739104');
      await card.getByLabel('Confirmer le PIN').fill('739104');
      await card.getByRole('button', { name: 'Changer le PIN' }).click();
      await expect(card.getByRole('alert')).toContainText('incorrect');

      await card.getByLabel('PIN actuel').fill(PIN);
      await card.getByRole('button', { name: 'Changer le PIN' }).click();
      await expect(page.getByText('PIN modifié', { exact: true })).toBeVisible();

      await logoutViaUi(page);
      await loginPhoneViaUi(page, phone, PIN);
      await expect(
        page.getByRole('alert').filter({ hasText: 'Identifiants invalides' }),
      ).toBeVisible();
      await loginPhoneViaUi(page, phone, '739104');
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('mot de passe : confirmation différente refusée', async ({ page }) => {
      await registerViaUi(page, uniqueEmail('mdpmismatch'));
      await goToSecurity(page);
      const card = page.getByTestId('card-email-password');
      await card.getByLabel('Mot de passe actuel').fill(PASSWORD);
      await card.getByLabel('Nouveau mot de passe').fill('nouveau-mdp-123');
      await card.getByLabel('Confirmer le mot de passe').fill('different-mdp-1');
      await card.getByRole('button', { name: 'Changer le mot de passe' }).click();
      await expect(card.getByText('Les mots de passe ne correspondent pas')).toBeVisible();
    });

    test('la carte Google est absente quand Google n’est pas configuré', async ({ page }) => {
      await registerViaUi(page, uniqueEmail('nogoogle'));
      await goToSecurity(page);
      await expect(page.getByTestId('card-phone-pin')).toBeVisible();
      await expect(page.getByTestId('card-google')).toHaveCount(0);
    });
  });

  test.describe(`récupération du PIN (${device})`, () => {
    test.use({ viewport });

    test('sans email confirmé : réponse neutre qui oriente vers un administrateur', async ({
      page,
    }) => {
      const phone = await registerPhoneViaUi(page);
      await logoutViaUi(page);
      await page.goto('/fr/connexion');
      await page.getByRole('tab', { name: 'Téléphone' }).click();
      await page.getByRole('link', { name: 'PIN oublié ?' }).click();
      await expect(page).toHaveURL(/\/pin-oublie$/);
      await page.getByLabel('Numéro de téléphone').fill(phone.national);
      await page.getByRole('button', { name: 'Envoyer le lien' }).click();
      await expect(page.getByText(/Si ce numéro a un compte/)).toBeVisible();
      await expect(page.getByText(/contactez l’équipe Churchy/)).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test('par email : ajoute et confirme l’email, demande le lien, choisit un nouveau PIN, se reconnecte', async ({
      page,
    }) => {
      const phone = await registerPhoneViaUi(page);
      const email = uniqueEmail('pinmail');
      await goToSecurity(page);
      const card = page.getByTestId('card-email-password');
      await card.getByLabel('Adresse email').fill(email);
      await card.getByLabel('PIN actuel').fill(PIN);
      await card.getByRole('button', { name: 'Ajouter l’email' }).click();
      await expect(page.getByText('Email ajouté', { exact: true })).toBeVisible();

      await page.goto(await latestEmailLink(email, 'auth.email-verification-requested'));
      await expect(page.getByText('Adresse email confirmée')).toBeVisible();
      await page.goto('/dashboard');
      await logoutViaUi(page);

      await page.goto('/fr/pin-oublie');
      await page.getByLabel('Numéro de téléphone').fill(phone.national);
      await page.getByRole('button', { name: 'Envoyer le lien' }).click();
      await expect(page.getByText(/Si ce numéro a un compte/)).toBeVisible();

      const link = await latestEmailLink(email, 'auth.pin-reset-requested');
      expect(link).toContain('/fr/reinitialisation-pin?token=');
      await page.goto(link);
      await page.getByLabel('Nouveau PIN').fill('739104');
      await page.getByLabel('Confirmer le PIN').fill('739104');
      await page.getByRole('button', { name: 'Enregistrer le PIN' }).click();
      await expect(page).toHaveURL(/\/connexion\?reset=pin$/);
      await expect(page.getByText('Votre PIN a été modifié')).toBeVisible();
      // La page s'ouvre directement sur l'onglet Téléphone.
      await expect(page.getByRole('tab', { name: 'Téléphone' })).toHaveAttribute(
        'aria-selected',
        'true',
      );

      await page.getByLabel('Numéro de téléphone').fill(phone.national);
      await page.getByLabel('PIN', { exact: true }).fill('739104');
      await page.getByRole('button', { name: 'Se connecter' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      // Le lien est à usage unique.
      await page.goto(link);
      await page.getByLabel('Nouveau PIN').fill('846205');
      await page.getByLabel('Confirmer le PIN').fill('846205');
      await page.getByRole('button', { name: 'Enregistrer le PIN' }).click();
      await expect(
        page.getByRole('alert').filter({ hasText: 'Lien invalide ou expiré' }),
      ).toBeVisible();
    });

    test('lien sans jeton : message et chemin pour en redemander un', async ({ page }) => {
      await page.goto('/fr/reinitialisation-pin');
      await expect(page.getByText('Lien invalide : le jeton est manquant.')).toBeVisible();
      await page.getByRole('link', { name: 'Demander un nouveau lien' }).click();
      await expect(page).toHaveURL(/\/pin-oublie$/);
    });
  });

  test.describe(`administrateur de la plateforme (${device})`, () => {
    test.use({ viewport });

    test('un utilisateur ordinaire ne voit ni le lien ni la page', async ({ page }) => {
      await registerViaUi(page, uniqueEmail('notadmin'));
      await expect(page.getByRole('link', { name: 'Réinitialiser un PIN' })).toHaveCount(0);
      await page.goto('/dashboard/admin/pin-reset');
      await expect(page.getByText('réservée aux administrateurs de la plateforme')).toBeVisible();
      await expect(page.getByLabel('Numéro de téléphone')).toHaveCount(0);
    });

    test('remet un lien de réinitialisation à une personne sans email, qui retrouve son accès', async ({
      page,
      browser,
    }) => {
      // 1. La personne s'inscrit par téléphone (sans email) puis « perd » son PIN.
      const userContext = await browser.newContext({ viewport });
      const userPage = await userContext.newPage();
      const phone = await registerPhoneViaUi(userPage, uniquePhone(), { firstName: 'Perdue' });
      await logoutViaUi(userPage);

      // 2. Un administrateur de la plateforme crée le lien.
      const adminEmail = uniqueEmail('platformadmin');
      await registerViaUi(page, adminEmail);
      await makeSuperAdmin(adminEmail);
      await page.reload();
      await page.goto('/dashboard/admin/pin-reset');
      await page.getByLabel('Numéro de téléphone').fill(phone.national);
      await page.getByRole('button', { name: 'Créer le lien' }).click();
      const result = page.getByTestId('pin-reset-result');
      await expect(result).toContainText('Perdue Ngono');
      const link = await page.getByLabel('Lien de réinitialisation').inputValue();
      expect(link).toContain('/fr/reinitialisation-pin?token=');
      await expectNoHorizontalScroll(page);

      // 3. La personne ouvre le lien et choisit un nouveau PIN.
      await userPage.goto(link);
      await userPage.getByLabel('Nouveau PIN').fill('739104');
      await userPage.getByLabel('Confirmer le PIN').fill('739104');
      await userPage.getByRole('button', { name: 'Enregistrer le PIN' }).click();
      await expect(userPage).toHaveURL(/\/connexion\?reset=pin$/);
      await loginPhoneViaUi(userPage, phone, '739104');
      await expect(userPage).toHaveURL(/\/dashboard$/);
      await userContext.close();
    });

    test('numéro sans compte : erreur affichée dans la page', async ({ page }) => {
      const adminEmail = uniqueEmail('platformadmin2');
      await registerViaUi(page, adminEmail);
      await makeSuperAdmin(adminEmail);
      await page.goto('/dashboard/admin/pin-reset');
      await page.getByLabel('Numéro de téléphone').fill(uniquePhone().national);
      await page.getByRole('button', { name: 'Créer le lien' }).click();
      await expect(
        page.getByRole('alert').filter({ hasText: 'Aucun compte avec ce numéro' }),
      ).toBeVisible();
    });
  });
}

// --- Google (interface) : le script Google et les réponses de l'API sont simulés. Le serveur (vérification du
// jeton, liaison, prise de contrôle évitée) est couvert par les tests fonctionnels de l'API. ----------------------

const WEB_ORIGIN = 'http://localhost:3210';
const CORS = {
  'access-control-allow-origin': WEB_ORIGIN,
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'content-type, accept-language',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
};

const GOOGLE_STUB = `
window.google = { accounts: { id: {
  initialize(cfg) { window.__googleCallback = cfg.callback; window.__googleClientId = cfg.client_id; },
  renderButton(el, opts) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Google (test) ' + opts.text;
    b.onclick = () => window.__googleCallback({ credential: 'fake-google-id-token' });
    el.appendChild(b);
  },
} } };`;

type PageT = import('@playwright/test').Page;

/** Active Google : l'API annonce un identifiant client, le script officiel est remplacé par un bouton factice. */
async function enableFakeGoogle(page: PageT) {
  // Les réponses simulées n'ouvrent pas de vraie session : sans cela, les appels du tableau de bord (favoris…)
  // échoueraient en 401 et la session serait déclarée perdue. Enregistrée en premier = appliquée en dernier.
  await page.route('**/api/favorites', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: '[]' }),
  );
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: GOOGLE_STUB }),
  );
  await page.route('**/api/auth/providers', (route) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ google: { clientId: 'e2e-client.apps.googleusercontent.com' } }),
    }),
  );
}

const fakeUser = (over: Record<string, unknown> = {}) => ({
  id: 'g1',
  email: 'google.user@e2e.test',
  phone: null,
  firstName: 'Gaby',
  lastName: 'Google',
  role: 'USER',
  emailVerified: true,
  locale: 'fr',
  methods: { password: false, pin: false, google: true },
  ...over,
});

/** Répond à une route de l'API (préflight CORS compris) ; pose le témoin de session comme le ferait l'API. */
async function mockApi(
  page: PageT,
  pattern: string,
  status: number,
  body: unknown,
  calls: unknown[] = [],
) {
  await page.route(pattern, async (route) => {
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: CORS });
    calls.push(route.request().postDataJSON());
    await page.context().addCookies([{ name: 'churchy_session', value: '1', url: WEB_ORIGIN }]);
    return route.fulfill({
      status,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`Google (${device})`, () => {
    test.use({ viewport });

    test('sans configuration côté serveur : aucun bouton Google, aucun script chargé', async ({
      page,
    }) => {
      let googleRequested = false;
      await page.route('https://accounts.google.com/**', (route) => {
        googleRequested = true;
        return route.abort();
      });
      await page.goto('/fr/connexion');
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByTestId('google-button')).toHaveCount(0);
      await expect(page.getByText('ou', { exact: true })).toHaveCount(0);
      expect(googleRequested).toBe(false);
    });

    test('connexion : le bouton Google apparaît au-dessus des modes email et téléphone', async ({
      page,
    }) => {
      await enableFakeGoogle(page);
      await page.goto('/fr/connexion');
      const button = page.getByRole('button', { name: /Google \(test\) signin_with/ });
      await expect(button).toBeVisible();
      await expect(page.getByText('ou', { exact: true })).toBeVisible();
      const googleBox = (await page.getByTestId('google-button').boundingBox())!;
      const tabsBox = (await page.getByRole('tablist').boundingBox())!;
      expect(googleBox.y).toBeLessThan(tabsBox.y);
      await expectNoHorizontalScroll(page);
    });

    test('inscription : le bouton propose « signup_with » et un nouveau compte arrive sur le tableau de bord', async ({
      page,
    }) => {
      await enableFakeGoogle(page);
      const calls: unknown[] = [];
      await mockApi(page, '**/api/auth/google', 200, { status: 'ok', user: fakeUser() }, calls);
      await page.goto('/fr/inscription');
      await page.getByRole('button', { name: /Google \(test\) signup_with/ }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      // Le jeton de Google et la langue de l'interface partent vers l'API (qui, elle, vérifie le jeton).
      expect(calls[0]).toEqual({ idToken: 'fake-google-id-token', locale: 'fr' });
    });

    test('un compte existe déjà : mot de passe demandé avant de lier, mauvais puis bon', async ({
      page,
    }) => {
      await enableFakeGoogle(page);
      await mockApi(page, '**/api/auth/google', 200, {
        status: 'link_required',
        email: 'jean@e2e.test',
      });
      let attempts = 0;
      await page.route('**/api/auth/google/link', async (route) => {
        if (route.request().method() === 'OPTIONS')
          return route.fulfill({ status: 204, headers: CORS });
        attempts += 1;
        if (attempts === 1) {
          return route.fulfill({
            status: 400,
            headers: CORS,
            contentType: 'application/json',
            body: JSON.stringify({ statusCode: 400, message: { message: 'invalidCredentials' } }),
          });
        }
        await page.context().addCookies([{ name: 'churchy_session', value: '1', url: WEB_ORIGIN }]);
        return route.fulfill({
          status: 200,
          headers: CORS,
          contentType: 'application/json',
          body: JSON.stringify({
            user: fakeUser({
              email: 'jean@e2e.test',
              methods: { password: true, pin: false, google: true },
            }),
          }),
        });
      });

      await page.goto('/fr/connexion');
      await page.getByRole('button', { name: /Google \(test\)/ }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('jean@e2e.test');
      // Boîte de dialogue utilisable sur tous les écrans : entièrement dans la fenêtre.
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);

      await dialog.getByLabel('Mot de passe', { exact: true }).fill('mauvais-mdp-1');
      await dialog.getByRole('button', { name: 'Lier et me connecter' }).click();
      await expect(dialog.getByText('Identifiants invalides')).toBeVisible();
      await expect(page).toHaveURL(/\/connexion/);

      await dialog.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
      await dialog.getByRole('button', { name: 'Lier et me connecter' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('annuler la liaison referme la boîte et laisse la page de connexion', async ({ page }) => {
      await enableFakeGoogle(page);
      await mockApi(page, '**/api/auth/google', 200, {
        status: 'link_required',
        email: 'jean@e2e.test',
      });
      await page.goto('/fr/connexion');
      await page.getByRole('button', { name: /Google \(test\)/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page).toHaveURL(/\/connexion/);
    });

    test('jeton refusé par l’API : message d’erreur, on reste sur la page', async ({ page }) => {
      await enableFakeGoogle(page);
      await page.route('**/api/auth/google', async (route) => {
        if (route.request().method() === 'OPTIONS')
          return route.fulfill({ status: 204, headers: CORS });
        return route.fulfill({
          status: 401,
          headers: CORS,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 401, message: { message: 'googleTokenInvalid' } }),
        });
      });
      await page.goto('/fr/connexion');
      await page.getByRole('button', { name: /Google \(test\)/ }).click();
      await expect(page.getByText('Connexion Google refusée. Réessayez.').first()).toBeVisible();
      await expect(page).toHaveURL(/\/connexion/);
    });

    test('page Sécurité : la carte Google propose la liaison, avec la preuve du mot de passe', async ({
      page,
    }) => {
      await registerViaUi(page, uniqueEmail('gsecurity'));
      await enableFakeGoogle(page);
      const calls: unknown[] = [];
      await page.route('**/api/auth/me/google', async (route) => {
        if (route.request().method() === 'OPTIONS')
          return route.fulfill({ status: 204, headers: CORS });
        calls.push(route.request().postDataJSON());
        return route.fulfill({
          status: 200,
          headers: CORS,
          contentType: 'application/json',
          body: JSON.stringify(fakeUser({ methods: { password: true, pin: false, google: true } })),
        });
      });
      await goToSecurity(page);
      const card = page.getByTestId('card-google');
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: /Google \(test\)/ }).click();
      await card.getByLabel('Mot de passe actuel').fill(PASSWORD);
      await card.getByRole('button', { name: 'Lier Google' }).click();
      await expect(page.getByText('Compte Google lié', { exact: true })).toBeVisible();
      expect(calls[0]).toEqual({ idToken: 'fake-google-id-token', currentPassword: PASSWORD });
      await expect(page.getByTestId('method-google')).toHaveAttribute('data-active', 'true');
    });
  });

  test.describe(`anglais (${device})`, () => {
    test.use({ viewport });

    test('connexion et inscription par téléphone en anglais', async ({ page }) => {
      await page.goto('/en/login');
      await page.getByRole('tab', { name: 'Phone' }).click();
      await expect(page.getByLabel('Phone number')).toBeVisible();
      await expect(page.getByLabel('Country')).toHaveValue('Cameroun');
      await expect(page.getByRole('option', { name: 'Cameroon (+237)' })).toBeAttached();
      await page.getByRole('link', { name: 'Forgot PIN?' }).click();
      await expect(page).toHaveURL(/\/en\/forgot-pin$/);

      await page.goto('/en/register');
      await page.getByRole('tab', { name: 'Phone' }).click();
      const phone = uniquePhone();
      await page.getByLabel('First name').fill('Mary');
      await page.getByLabel('Last name').fill('Smith');
      await page.getByLabel('Phone number').fill(phone.national);
      await page.getByLabel('PIN', { exact: true }).fill(PIN);
      await page.getByLabel('Confirm PIN').fill(PIN);
      await page.getByRole('button', { name: 'Create my account' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      // La langue de l'interface est devenue celle du compte.
      await goToSecurityEn(page);
    });
  });
}

const goToSecurityEn = async (page: PageT) => {
  await page.goto('/dashboard/security');
  await expect(page.getByRole('heading', { name: 'Account security' })).toBeVisible();
};
