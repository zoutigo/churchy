import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';

const replace = vi.fn();
const refresh = vi.fn();
const logout = vi.fn();
let user: {
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
} | null;
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
  usePathname: () => '/dashboard',
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user, logout }) }));

describe('Header', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    logout.mockReset();
    logout.mockResolvedValue(undefined);
    user = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@paroisse.fr',
      emailVerified: true,
    };
  });

  it('affiche les initiales et le nom de l’utilisateur', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: 'Menu utilisateur' })).toHaveTextContent('JD');
    expect(screen.getByRole('button', { name: 'Menu utilisateur' })).toHaveTextContent(
      'Jean Dupont',
    );
  });

  it('n’affiche aucun menu sans utilisateur', () => {
    user = null;
    render(<Header />);
    expect(screen.queryByRole('button', { name: 'Menu utilisateur' })).not.toBeInTheDocument();
  });

  it('montre l’email dans le menu et signale un email non confirmé', async () => {
    user = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@paroisse.fr',
      emailVerified: false,
    };
    render(<Header />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Menu utilisateur' }));

    expect(await screen.findByText('jean@paroisse.fr')).toBeInTheDocument();
    expect(screen.getByText('Email non confirmé')).toBeInTheDocument();
  });

  it('se déconnecte via le menu puis retourne à la page de connexion', async () => {
    render(<Header />);
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: 'Menu utilisateur' }));
    await u.click(await screen.findByRole('menuitem', { name: /Se déconnecter/ }));

    expect(logout).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/fr/connexion'));
  });
});
