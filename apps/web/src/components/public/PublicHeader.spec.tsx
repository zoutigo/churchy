import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublicHeader } from './PublicHeader';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr',
}));
let auth: { user: { firstName: string } | null; initializing: boolean };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
let favorites: { ids: string[]; ready: boolean };
vi.mock('@/components/favorites/FavoritesProvider', () => ({ useFavorites: () => favorites }));

describe('PublicHeader', () => {
  beforeEach(() => {
    auth = { user: null, initializing: false };
    favorites = { ids: [], ready: true };
  });

  it('« Mes favoris » est un lien du menu, pour un visiteur comme pour un connecté', () => {
    const { unmount } = render(<PublicHeader />);
    expect(screen.getByRole('link', { name: /Mes favoris/ })).toHaveAttribute(
      'href',
      '/fr/favoris',
    );
    unmount();
    auth = { user: { firstName: 'Jean' }, initializing: false };
    render(<PublicHeader />);
    expect(screen.getByRole('link', { name: /Mes favoris/ })).toHaveAttribute(
      'href',
      '/fr/favoris',
    );
  });

  it('affiche le nombre de favoris, et rien quand il n’y en a pas', () => {
    const { unmount } = render(<PublicHeader />);
    expect(screen.queryByLabelText(/favori/)).not.toBeInTheDocument();
    unmount();
    favorites = { ids: ['a', 'b'], ready: true };
    render(<PublicHeader />);
    expect(screen.getByLabelText('2 favoris')).toHaveTextContent('2');
  });

  it('visiteur : logo, Pour les paroisses et Connexion seule (pas de « Créer un compte »)', () => {
    render(<PublicHeader />);
    expect(screen.getByRole('link', { name: 'Churchy, accueil' })).toHaveAttribute('href', '/fr');
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(nav).toHaveTextContent('Pour les paroisses');
    expect(screen.getByRole('link', { name: 'Connexion' })).toHaveAttribute(
      'href',
      '/fr/connexion',
    );
    expect(screen.queryByRole('link', { name: 'Créer un compte' })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/fr/inscription"]')).toBeNull();
  });

  it('connecté : un lien « Mon espace » remplace connexion et inscription', () => {
    auth = { user: { firstName: 'Jean' }, initializing: false };
    render(<PublicHeader />);
    expect(screen.getByRole('link', { name: 'Mon espace' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: 'Connexion' })).not.toBeInTheDocument();
  });

  it('pendant la vérification de session, n’affiche ni connexion ni espace (pas de clignotement)', () => {
    auth = { user: null, initializing: true };
    render(<PublicHeader />);
    expect(screen.queryByRole('link', { name: 'Connexion' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mon espace' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pour les paroisses' })).toBeInTheDocument();
  });

  it('sans cookie de session (hasSession=false), affiche Connexion sans attendre la vérification', () => {
    auth = { user: null, initializing: true };
    render(<PublicHeader hasSession={false} />);
    expect(screen.getByRole('link', { name: 'Connexion' })).toHaveAttribute(
      'href',
      '/fr/connexion',
    );
    expect(screen.queryByRole('link', { name: 'Créer un compte' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mon espace' })).not.toBeInTheDocument();
  });

  it('avec un cookie de session (hasSession=true), n’affiche rien tant que la session n’est pas vérifiée', () => {
    auth = { user: null, initializing: true };
    render(<PublicHeader hasSession />);
    expect(screen.queryByRole('link', { name: 'Connexion' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mon espace' })).not.toBeInTheDocument();
  });

  it('une session vérifiée l’emporte sur l’indice serveur', () => {
    auth = { user: { firstName: 'Jean' }, initializing: false };
    render(<PublicHeader hasSession={false} />);
    expect(screen.getByRole('link', { name: 'Mon espace' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Connexion' })).not.toBeInTheDocument();
  });

  it('mobile : le menu s’ouvre et se ferme avec le bouton, et se referme après un clic sur un lien', async () => {
    const user = userEvent.setup();
    render(<PublicHeader />);
    const button = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Menu mobile' })).not.toBeInTheDocument();

    await user.click(button);
    const menu = screen.getByRole('navigation', { name: 'Menu mobile' });
    expect(screen.getByRole('button', { name: 'Fermer le menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.click(menu.querySelector('a[href="/fr/connexion"]') as HTMLElement);
    expect(screen.queryByRole('navigation', { name: 'Menu mobile' })).not.toBeInTheDocument();
  });
});
