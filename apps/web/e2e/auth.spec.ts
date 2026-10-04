import { expect, test } from '@playwright/test';
import {
  PASSWORD,
  latestEmailLink,
  loginViaUi,
  logoutViaUi,
  registerViaUi,
  uniqueEmail,
} from './helpers';

test.describe('protection des pages privées', () => {
  test('un visiteur est renvoyé vers la connexion puis ramené à la page demandée', async ({
    page,
  }) => {
    const email = uniqueEmail('protect');
    await registerViaUi(page, email);
    await logoutViaUi(page);

    await page.goto('/dashboard/parishes');
    await expect(page).toHaveURL(/\/fr\/connexion\?next=%2Fdashboard%2Fparishes$/);

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/dashboard\/parishes$/);
    await expect(page.getByRole('heading', { name: 'Mes paroisses' })).toBeVisible();
  });

  test('un utilisateur connecté qui ouvre /login est renvoyé vers son espace', async ({ page }) => {
    await registerViaUi(page, uniqueEmail('already'));
    await page.goto('/fr/connexion');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('refuse une redirection vers un site tiers (?next=https://…)', async ({ page }) => {
    const email = uniqueEmail('redirect');
    await registerViaUi(page, email);
    await logoutViaUi(page);

    await loginViaUi(page, email, PASSWORD, 'https://evil.example/phishing');

    await expect(page).toHaveURL(/localhost:3210\/dashboard$/);
  });
});

test.describe('connexion et déconnexion', () => {
  test('une connexion refusée affiche un message lisible', async ({ page }) => {
    await loginViaUi(page, 'inconnu@e2e.test', 'mauvais-mot-de-passe');
    await expect(page.getByRole('main').getByText('Identifiants invalides')).toBeVisible();
    await expect(page).toHaveURL(/\/fr\/connexion$/);
  });

  test('un formulaire vide signale chaque champ invalide (bordure rouge)', async ({ page }) => {
    await page.goto('/fr/connexion');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('permet d’afficher le mot de passe saisi', async ({ page }) => {
    await page.goto('/fr/connexion');
    const input = page.getByLabel('Mot de passe', { exact: true });
    await expect(input).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Afficher le mot de passe' }).click();
    await expect(input).toHaveAttribute('type', 'text');
  });

  test('la déconnexion ferme la session : le tableau de bord n’est plus accessible', async ({
    page,
  }) => {
    await registerViaUi(page, uniqueEmail('logout'));
    await logoutViaUi(page);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/fr\/connexion\?next=%2Fdashboard$/);
  });

  test('la session survit à un rechargement de page', async ({ page }) => {
    await registerViaUi(page, uniqueEmail('reload'), 'Marie');
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('button', { name: 'Menu utilisateur' })).toContainText('Marie');
  });
});

test.describe('sécurité de la session', () => {
  test('les jetons restent inaccessibles au JavaScript (cookies httpOnly, rien dans le localStorage)', async ({
    page,
    context,
  }) => {
    await registerViaUi(page, uniqueEmail('httponly'));

    const cookies = await context.cookies();
    const byName = Object.fromEntries(cookies.map((c) => [c.name, c]));
    expect(byName['churchy_at']).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
    expect(byName['churchy_rt']).toMatchObject({
      httpOnly: true,
      sameSite: 'Lax',
      path: '/api/auth',
    });
    expect(byName['churchy_session'].httpOnly).toBe(false);

    const visible = await page.evaluate(() => document.cookie);
    expect(visible).toContain('churchy_session=1');
    expect(visible).not.toContain('churchy_at');
    expect(visible).not.toContain('churchy_rt');
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toMatch(
      /token|jwt/i,
    );
  });

  test('renouvelle la session en silence quand le jeton d’accès a expiré', async ({
    page,
    context,
  }) => {
    await registerViaUi(page, uniqueEmail('silent'), 'Paul');
    await context.clearCookies({ name: 'churchy_at' });
    expect((await context.cookies()).some((c) => c.name === 'churchy_at')).toBe(false);

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('button', { name: 'Menu utilisateur' })).toContainText('Paul');
    expect((await context.cookies()).some((c) => c.name === 'churchy_at')).toBe(true);
  });

  test('redirige vers la connexion avec un message quand la session est perdue en cours de navigation', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('expired');
    await registerViaUi(page, email);
    // Jeton d'accès ET de refresh disparus : la session ne peut plus être renouvelée.
    await context.clearCookies({ name: 'churchy_at' });
    await context.clearCookies({ name: 'churchy_rt' });

    await page.getByRole('link', { name: 'Paroisses', exact: true }).click();

    await expect(page).toHaveURL(/\/fr\/connexion\?expired=1&next=%2Fdashboard%2Fparishes$/);
    await expect(page.getByText('Votre session a expiré')).toBeVisible();

    // On peut se reconnecter et on retrouve la page demandée.
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/dashboard\/parishes$/);
  });

  test('envoie des en-têtes de sécurité sur les pages du site', async ({ page }) => {
    const response = await page.goto('/fr/connexion');
    const headers = response?.headers() ?? {};
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['x-powered-by']).toBeUndefined();
  });
});

test.describe('navigation de la page d’accueil', () => {
  test('propose Connexion seule aux visiteurs (l’inscription se fait depuis la page de connexion)', async ({
    page,
  }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.getByRole('link', { name: 'Connexion' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Créer un compte' })).toHaveCount(0);
    await nav.getByRole('link', { name: 'Connexion' }).click();
    await page.getByRole('link', { name: "S'inscrire" }).click();
    await expect(page).toHaveURL(/\/fr\/inscription$/);
  });

  test('propose « Mon espace » aux utilisateurs connectés', async ({ page }) => {
    await registerViaUi(page, uniqueEmail('landing'));
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.getByRole('link', { name: 'Mon espace' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Connexion' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Créer un compte' })).toHaveCount(0);
  });
});

test.describe('vérification de l’email', () => {
  test('rappelle de confirmer l’adresse, renvoie le lien, puis la bannière disparaît une fois confirmée', async ({
    page,
  }) => {
    const email = uniqueEmail('verify');
    await registerViaUi(page, email);
    await expect(page.getByText('Confirmez votre adresse email')).toBeVisible();

    // Vrai clic utilisateur sur le bouton de la bannière.
    await page.getByRole('button', { name: 'Renvoyer le lien' }).click();
    await expect(page.getByText(/nouveau lien vient d.être envoyé/)).toBeVisible();

    const link = await latestEmailLink(email, 'auth.email-verification-requested');
    await page.goto(link);
    await expect(page.getByText('Adresse email confirmée')).toBeVisible();

    await page.getByRole('link', { name: 'Accéder à mon espace' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Confirmez votre adresse email')).toHaveCount(0);
  });

  test('un lien de confirmation ne fonctionne qu’une fois', async ({ page }) => {
    const email = uniqueEmail('once');
    await registerViaUi(page, email);
    const link = await latestEmailLink(email, 'auth.email-verification-requested');

    await page.goto(link);
    await expect(page.getByText('Adresse email confirmée')).toBeVisible();

    await page.goto(link);
    await expect(page.getByText('Impossible de confirmer')).toBeVisible();
    await expect(page.getByRole('main').getByText('Lien invalide ou expiré')).toBeVisible();
  });

  test('un lien sans jeton affiche une erreur claire', async ({ page }) => {
    await page.goto('/fr/verification-email');
    await expect(page.getByText('Lien invalide : le jeton est manquant.')).toBeVisible();
  });
});

test.describe('mot de passe oublié', () => {
  test('réinitialise le mot de passe via le lien reçu, puis l’ancien ne marche plus', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot');
    await registerViaUi(page, email);
    await logoutViaUi(page);

    await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
    await expect(page).toHaveURL(/\/fr\/mot-de-passe-oublie$/);
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Envoyer le lien' }).click();
    await expect(page.getByText('Vérifiez votre boîte mail')).toBeVisible();

    const link = await latestEmailLink(email, 'auth.password-reset-requested');
    await page.goto(link);

    await page.getByLabel('Nouveau mot de passe').fill('nouveaumdp1');
    await page.getByLabel('Confirmer le mot de passe').fill('different456');
    await page.getByRole('button', { name: 'Modifier le mot de passe' }).click();
    await expect(page.getByText('Les mots de passe ne correspondent pas')).toBeVisible();

    await page.getByLabel('Confirmer le mot de passe').fill('nouveaumdp1');
    await page.getByRole('button', { name: 'Modifier le mot de passe' }).click();

    await expect(page).toHaveURL(/\/fr\/connexion\?reset=1$/);
    await expect(page.getByText('Mot de passe modifié')).toBeVisible();

    await loginViaUi(page, email, PASSWORD);
    await expect(page.getByRole('main').getByText('Identifiants invalides')).toBeVisible();

    await loginViaUi(page, email, 'nouveaumdp1');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('ne révèle pas si une adresse a un compte', async ({ page }) => {
    await page.goto('/fr/mot-de-passe-oublie');
    await page.getByLabel('Email').fill(uniqueEmail('personne'));
    await page.getByRole('button', { name: 'Envoyer le lien' }).click();
    await expect(page.getByText('Vérifiez votre boîte mail')).toBeVisible();
    await expect(page.getByText(/Si un compte existe/)).toBeVisible();
  });

  test('un lien de réinitialisation invalide propose d’en redemander un', async ({ page }) => {
    await page.goto('/fr/reinitialisation?token=jeton-invente');
    await page.getByLabel('Nouveau mot de passe').fill('nouveaumdp1');
    await page.getByLabel('Confirmer le mot de passe').fill('nouveaumdp1');
    await page.getByRole('button', { name: 'Modifier le mot de passe' }).click();

    await expect(page.getByRole('main').getByText('Lien invalide ou expiré')).toBeVisible();
    await page.getByRole('link', { name: 'Demander un nouveau lien' }).click();
    await expect(page).toHaveURL(/\/fr\/mot-de-passe-oublie$/);
  });
});
