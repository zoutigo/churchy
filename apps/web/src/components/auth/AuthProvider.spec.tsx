import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { SESSION_EXPIRED_EVENT } from '@/lib/auth/session';
import { AuthProvider, useAuthContext } from './AuthProvider';

const api = vi.hoisted(() => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('@/lib/api/auth.api', () => ({ authApi: api }));

const user = {
  id: 'u1',
  email: 'jean@paroisse.fr',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'USER',
  emailVerified: false,
};

let ctx: ReturnType<typeof useAuthContext>;
function Probe() {
  ctx = useAuthContext();
  return (
    <div>
      <span data-testid="state">
        {ctx.initializing ? 'initializing' : ctx.user ? `user:${ctx.user.email}` : 'anonymous'}
      </span>
      <span data-testid="expired">{String(ctx.sessionExpired)}</span>
      <span data-testid="loggedOut">{String(ctx.loggedOut)}</span>
    </div>
  );
}

const setSessionCookie = () => {
  document.cookie = 'churchy_session=1; path=/';
};
const clearSessionCookie = () => {
  document.cookie = 'churchy_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

const mount = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe('AuthProvider', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    clearSessionCookie();
  });

  it('n’appelle PAS l’API pour un visiteur anonyme (aucun cookie de session)', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));
    expect(api.me).not.toHaveBeenCalled();
  });

  it('charge l’utilisateur quand un cookie de session existe', async () => {
    setSessionCookie();
    api.me.mockResolvedValue(user);
    mount();
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('user:jean@paroisse.fr'),
    );
    expect(api.me).toHaveBeenCalledTimes(1);
  });

  it('devient anonyme si /auth/me échoue malgré le cookie (session révoquée)', async () => {
    setSessionCookie();
    api.me.mockRejectedValue(new Error('Unauthorized'));
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));
  });

  it('login : renseigne l’utilisateur', async () => {
    api.login.mockResolvedValue({ user });
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));

    await act(async () => {
      await ctx.login({ email: user.email, password: 'password123' });
    });

    expect(screen.getByTestId('state')).toHaveTextContent('user:jean@paroisse.fr');
    expect(ctx.loading).toBe(false);
  });

  it('login : propage l’erreur et reste anonyme', async () => {
    api.login.mockRejectedValue(new Error('Identifiants invalides'));
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));

    await expect(
      act(async () => {
        await ctx.login({ email: user.email, password: 'x' });
      }),
    ).rejects.toThrow('Identifiants invalides');
    expect(screen.getByTestId('state')).toHaveTextContent('anonymous');
    expect(ctx.loading).toBe(false);
  });

  it('logout : appelle l’API et efface l’utilisateur', async () => {
    setSessionCookie();
    api.me.mockResolvedValue(user);
    api.logout.mockResolvedValue({ ok: true });
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:'));

    await act(async () => {
      await ctx.logout();
    });

    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('state')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('loggedOut')).toHaveTextContent('true');
  });

  it('une nouvelle connexion réinitialise l’état « déconnecté volontairement »', async () => {
    setSessionCookie();
    api.me.mockResolvedValue(user);
    api.logout.mockResolvedValue({ ok: true });
    api.login.mockResolvedValue({ user });
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:'));
    await act(async () => {
      await ctx.logout();
    });
    expect(screen.getByTestId('loggedOut')).toHaveTextContent('true');

    await act(async () => {
      await ctx.login({ email: user.email, password: 'password123' });
    });

    expect(screen.getByTestId('loggedOut')).toHaveTextContent('false');
  });

  it('logout : l’interface se déconnecte même si le serveur est injoignable', async () => {
    setSessionCookie();
    api.me.mockResolvedValue(user);
    api.logout.mockRejectedValue(new Error('réseau'));
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:'));

    await act(async () => {
      await ctx.logout().catch(() => undefined);
    });

    expect(screen.getByTestId('state')).toHaveTextContent('anonymous');
  });

  it('passe à « session expirée » quand le client API signale la perte de session', async () => {
    setSessionCookie();
    api.me.mockResolvedValue(user);
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:'));

    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });

    expect(screen.getByTestId('state')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('expired')).toHaveTextContent('true');
  });

  it('useAuth hors du provider lève une erreur explicite', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});
