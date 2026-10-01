import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublicHeader } from './PublicHeader';

let auth: { user: { firstName: string } | null; initializing: boolean };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

describe('PublicHeader', () => {
  beforeEach(() => {
    auth = { user: null, initializing: false };
  });

  it('visiteur : logo, Pour les paroisses, Connexion, Créer un compte', () => {
    render(<PublicHeader />);
    expect(screen.getByRole('link', { name: 'Churchy, accueil' })).toHaveAttribute('href', '/');
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(nav).toHaveTextContent('Pour les paroisses');
    expect(screen.getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/register',
    );
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

    await user.click(menu.querySelector('a[href="/login"]') as HTMLElement);
    expect(screen.queryByRole('navigation', { name: 'Menu mobile' })).not.toBeInTheDocument();
  });
});
