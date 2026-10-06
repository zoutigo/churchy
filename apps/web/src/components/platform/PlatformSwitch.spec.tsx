import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { PlatformSwitch } from './PlatformSwitch';

const push = vi.fn();
let role: string | undefined;
let pathname = '/dashboard';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => pathname }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: role ? { id: 'u1', role } : null }),
}));

describe('PlatformSwitch', () => {
  beforeEach(() => {
    push.mockReset();
    role = 'ADMIN';
    pathname = '/dashboard';
  });

  it.each(['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])('visible pour %s', (r) => {
    role = r;
    render(<PlatformSwitch />);
    expect(screen.getByRole('switch', { name: /plateforme et mon espace/ })).toBeInTheDocument();
  });

  it('invisible pour un compte ordinaire et sans session', () => {
    for (const r of ['USER', undefined]) {
      role = r;
      const { container, unmount } = render(<PlatformSwitch />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('dans « Mon espace » : interrupteur éteint, un clic mène à la plateforme', async () => {
    render(<PlatformSwitch />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(push).toHaveBeenCalledWith('/platform');
  });

  it.each(['/platform', '/platform/users'])(
    'sur %s : interrupteur allumé, un clic ramène à son espace',
    async (path) => {
      pathname = path;
      render(<PlatformSwitch />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      await userEvent.click(toggle);
      expect(push).toHaveBeenCalledWith('/dashboard');
    },
  );

  it('« /platformx » n’est pas la plateforme', () => {
    pathname = '/platformx';
    render(<PlatformSwitch />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('en anglais', () => {
    setTestLocale('en');
    render(<PlatformSwitch />);
    expect(screen.getByRole('switch', { name: /Switch between the platform/ })).toBeInTheDocument();
    expect(screen.getByText('My space')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });
});
