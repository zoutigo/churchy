import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setTestLocale } from '../../../vitest.setup';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';

let role: string | undefined;
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/security' }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: role ? { id: 'u1', role } : null }),
}));

describe.each([
  ['barre latérale', Sidebar],
  ['navigation mobile', MobileNav],
])('%s du tableau de bord', (_label, Component) => {
  beforeEach(() => {
    role = 'USER';
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

  it('cache la réinitialisation de PIN aux utilisateurs ordinaires', () => {
    render(<Component />);
    expect(screen.queryByRole('link', { name: /Réinitialiser un PIN/ })).not.toBeInTheDocument();
  });

  it('la montre aux administrateurs de la plateforme', () => {
    role = 'SUPER_ADMIN';
    render(<Component />);
    expect(screen.getByRole('link', { name: /Réinitialiser un PIN/ })).toHaveAttribute(
      'href',
      '/dashboard/admin/pin-reset',
    );
  });

  it('ne la montre pas sans utilisateur', () => {
    role = undefined;
    render(<Component />);
    expect(screen.queryByRole('link', { name: /Réinitialiser un PIN/ })).not.toBeInTheDocument();
  });

  it('en anglais', () => {
    setTestLocale('en');
    role = 'SUPER_ADMIN';
    render(<Component />);
    expect(screen.getByRole('link', { name: /Security/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Reset a PIN/ })).toBeInTheDocument();
  });
});
