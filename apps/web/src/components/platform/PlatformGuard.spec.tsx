import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformGuard } from './PlatformGuard';

const replace = vi.fn();
let role: string | undefined;
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/platform',
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: role ? { id: 'u1', role } : null }),
}));

describe('PlatformGuard', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it.each(['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])('laisse entrer %s', (r) => {
    role = r;
    render(
      <PlatformGuard>
        <p>contenu plateforme</p>
      </PlatformGuard>,
    );
    expect(screen.getByText('contenu plateforme')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renvoie un compte ordinaire à son espace, sans rien afficher', () => {
    role = 'USER';
    render(
      <PlatformGuard>
        <p>contenu plateforme</p>
      </PlatformGuard>,
    );
    expect(screen.queryByText('contenu plateforme')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/dashboard');
  });
});
