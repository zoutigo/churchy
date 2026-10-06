import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setTestLocale } from '../../../vitest.setup';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';

let role: string | undefined;
let pathname = '/dashboard/security';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: role ? { id: 'u1', role } : null }),
}));

describe.each([
  ['barre latérale', Sidebar],
  ['navigation mobile', MobileNav],
])('%s du tableau de bord', (_label, Component) => {
  beforeEach(() => {
    role = 'USER';
    pathname = '/dashboard/security';
  });

  it('propose la page Sécurité à tout le monde', () => {
    render(<Component />);
    expect(screen.getByRole('link', { name: /Sécurité/ })).toHaveAttribute(
      'href',
      '/dashboard/security',
    );
  });

  it('garde « Mes favoris » dans le tableau de bord (pas la page publique)', () => {
    render(<Component />);
    expect(screen.getByRole('link', { name: /Mes favoris/ })).toHaveAttribute(
      'href',
      '/dashboard/favorites',
    );
  });

  it.each(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'])(
    'ne mélange jamais les outils de plateforme au tableau de bord (%s)',
    (r) => {
      role = r;
      render(<Component />);
      expect(screen.queryByRole('link', { name: /Réinitialiser un PIN/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Comptes/ })).not.toBeInTheDocument();
    },
  );

  it('en anglais', () => {
    setTestLocale('en');
    render(<Component />);
    expect(screen.getByRole('link', { name: /Security/ })).toBeInTheDocument();
  });
});

describe.each([
  ['barre latérale', Sidebar],
  ['navigation mobile', MobileNav],
])('%s de la plateforme', (_label, Component) => {
  beforeEach(() => {
    role = 'ADMIN';
    pathname = '/platform';
  });

  it.each(['ADMIN', 'SUPER_ADMIN'])('%s : accueil, comptes et réinitialisation de PIN', (r) => {
    role = r;
    render(<Component area="platform" />);
    expect(screen.getByRole('link', { name: /Accueil/ })).toHaveAttribute('href', '/platform');
    expect(screen.getByRole('link', { name: /Comptes/ })).toHaveAttribute(
      'href',
      '/platform/users',
    );
    expect(screen.getByRole('link', { name: /Réinitialiser un PIN/ })).toHaveAttribute(
      'href',
      '/platform/pin-reset',
    );
  });

  it('le modérateur n’a que l’accueil (aucune permission sur les comptes)', () => {
    role = 'MODERATOR';
    render(<Component area="platform" />);
    expect(screen.getByRole('link', { name: /Accueil/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Comptes/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Réinitialiser un PIN/ })).not.toBeInTheDocument();
  });

  it('un utilisateur ordinaire ou sans session ne voit aucune entrée', () => {
    for (const r of ['USER', undefined]) {
      role = r;
      const { unmount } = render(<Component area="platform" />);
      expect(screen.queryByRole('link', { name: /Accueil/ })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('en anglais', () => {
    setTestLocale('en');
    render(<Component area="platform" />);
    expect(screen.getByRole('link', { name: /Accounts/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Reset a PIN/ })).toBeInTheDocument();
  });
});

describe('marque de l’espace plateforme', () => {
  it('la barre latérale affiche le badge « Plateforme » (et pas dans le tableau de bord)', () => {
    role = 'ADMIN';
    pathname = '/platform';
    const { unmount } = render(<Sidebar area="platform" />);
    expect(screen.getByText('Plateforme')).toBeInTheDocument();
    unmount();
    render(<Sidebar />);
    expect(screen.queryByText('Plateforme')).not.toBeInTheDocument();
  });
});
