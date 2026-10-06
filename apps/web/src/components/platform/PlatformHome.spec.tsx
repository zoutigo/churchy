import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setTestLocale } from '../../../vitest.setup';
import { PlatformHome } from './PlatformHome';

let role = 'MODERATOR';
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', role } }) }));

describe('PlatformHome', () => {
  it.each([
    ['SUPER_ADMIN', 'Super administrateur'],
    ['ADMIN', 'Administrateur'],
    ['MODERATOR', 'Modérateur'],
  ])('affiche le rôle %s', (r, label) => {
    role = r;
    render(<PlatformHome />);
    expect(screen.getByTestId('platform-role')).toHaveTextContent(`Votre rôle : ${label}`);
  });

  it('propose de retourner dans son espace', () => {
    render(<PlatformHome />);
    expect(screen.getByRole('link', { name: 'Retourner à mon espace' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('en anglais', () => {
    setTestLocale('en');
    role = 'ADMIN';
    render(<PlatformHome />);
    expect(screen.getByTestId('platform-role')).toHaveTextContent('Your role: Administrator');
  });
});
