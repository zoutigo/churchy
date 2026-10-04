import { expect, test } from '@playwright/test';
import { VIEWPORTS } from './helpers';

/**
 * Le visiteur sans session voit Connexion dès le rendu serveur : même si le JavaScript
 * ne se charge pas (JS désactivé simule un chargement en échec), l'en-tête n'est pas vide.
 */
test.describe('en-tête sans JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('desktop : Connexion est dans le HTML du serveur', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/login');
    await expect(nav.getByRole('link', { name: 'Créer un compte' })).toHaveCount(0);
  });

  test('les pages de connexion et d’inscription gardent leur en-tête et le lien « S’inscrire »', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login');
    await expect(
      page
        .getByRole('navigation', { name: 'Navigation principale' })
        .getByRole('link', { name: 'Connexion' }),
    ).toBeVisible();
    // L'inscription reste accessible depuis la connexion, même sans JavaScript.
    await expect(page.getByRole('link', { name: "S'inscrire" })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  test('avec un cookie de session, l’en-tête n’annonce pas « Connexion » à tort', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: 'churchy_session', value: '1', url: 'http://localhost:3210' },
    ]);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', {
        name: 'Connexion',
      }),
    ).toHaveCount(0);
  });
});
