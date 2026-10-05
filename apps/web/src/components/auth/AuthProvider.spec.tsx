import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { UserRole } from '@churchy/shared';
import { SESSION_EXPIRED_EVENT } from '@/lib/auth/session';
import { AuthProvider, useAuthContext } from './AuthProvider';

const api = vi.hoisted(() => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateLocale: vi.fn(),
  loginPhone: vi.fn(),
  registerPhone: vi.fn(),
  google: vi.fn(),
  googleLink: vi.fn(),
}));
vi.mock('@/lib/api/auth.api', () => ({ authApi: api }));

const user = {
  id: 'u1',
  email: 'jean@paroisse.fr',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: UserRole.USER,
  phone: null,
  emailVerified: false,
  locale: 'fr' as const,
  methods: { password: true, pin: false, google: false },
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

  it('setLocale : enregistre la langue sur le compte et met l’utilisateur à jour', async () => {
    setSessionCookie();
    api.me.mockResolvedValue(user);
    api.updateLocale.mockResolvedValue({ ...user, locale: 'en' });
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:'));

    await act(async () => {
      await ctx.setLocale('en');
    });

    expect(api.updateLocale).toHaveBeenCalledWith('en');
    expect(ctx.user?.locale).toBe('en');
  });

  it('setLocale : un échec laisse l’utilisateur inchangé et remonte l’erreur', async () => {
    setSessionCookie();
    api.me.mockResolvedValue(user);
    api.updateLocale.mockRejectedValue(new Error('hors ligne'));
    mount();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:'));

    await expect(ctx.setLocale('en')).rejects.toThrow('hors ligne');
    expect(ctx.user?.locale).toBe('fr');
  });

  it('useAuth hors du provider lève une erreur explicite', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
    spy.mockRestore();
  });

  describe('téléphone + PIN et Google', () => {
    const phoneUser = { ...user, email: null, phone: '+237677123456' };

    it('loginPhone : renseigne l’utilisateur (compte sans email)', async () => {
      api.loginPhone.mockResolvedValue({ user: phoneUser });
      mount();
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));
      await act(async () => {
        await ctx.loginPhone({ phone: '+237677123456', pin: '482915' });
      });
      expect(api.loginPhone).toHaveBeenCalledWith({ phone: '+237677123456', pin: '482915' });
      expect(ctx.user?.phone).toBe('+237677123456');
      expect(ctx.loading).toBe(false);
    });

    it('loginPhone : propage l’erreur et reste anonyme', async () => {
      api.loginPhone.mockRejectedValue(new Error('Identifiants invalides'));
      mount();
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));
      await expect(
        act(async () => {
          await ctx.loginPhone({ phone: '+237677123456', pin: '000001' });
        }),
      ).rejects.toThrow('Identifiants invalides');
      expect(ctx.user).toBeNull();
      expect(ctx.loading).toBe(false);
    });

    it('registerPhone : ouvre la session', async () => {
      api.registerPhone.mockResolvedValue({ user: phoneUser });
      mount();
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));
      await act(async () => {
        await ctx.registerPhone({
          phone: '+237677123456',
          pin: '482915',
          firstName: 'Marie',
          lastName: 'Ngono',
        });
      });
      expect(ctx.user?.id).toBe('u1');
    });

    it('loginGoogle : ouvre la session quand le compte est connu', async () => {
      api.google.mockResolvedValue({ status: 'ok', user });
      mount();
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));
      let result: unknown;
      await act(async () => {
        result = await ctx.loginGoogle({ idToken: 't' });
      });
      expect(result).toEqual({ user });
      expect(ctx.user?.email).toBe('jean@paroisse.fr');
    });

    it('loginGoogle : un compte existe déjà → pas de session, la liaison est demandée', async () => {
      api.google.mockResolvedValue({ status: 'link_required', email: 'jean@paroisse.fr' });
      mount();
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));
      let result: unknown;
      await act(async () => {
        result = await ctx.loginGoogle({ idToken: 't' });
      });
      expect(result).toEqual({ linkRequired: 'jean@paroisse.fr' });
      expect(ctx.user).toBeNull();
    });

    it('linkGoogleWithPassword : ouvre la session', async () => {
      api.googleLink.mockResolvedValue({ user });
      mount();
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'));
      await act(async () => {
        await ctx.linkGoogleWithPassword({ idToken: 't', password: 'password123' });
      });
      expect(ctx.user?.id).toBe('u1');
    });

    it('applyUser : met à jour le compte courant (page Sécurité)', async () => {
      setSessionCookie();
      api.me.mockResolvedValue(user);
      mount();
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:'));
      act(() => ctx.applyUser({ ...user, methods: { password: true, pin: true, google: false } }));
      expect(ctx.user?.methods.pin).toBe(true);
    });

    it('une nouvelle connexion par téléphone réinitialise « session expirée »', async () => {
      setSessionCookie();
      api.me.mockResolvedValue(user);
      api.loginPhone.mockResolvedValue({ user: phoneUser });
      mount();
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:'));
      act(() => {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      });
      expect(screen.getByTestId('expired')).toHaveTextContent('true');
      await act(async () => {
        await ctx.loginPhone({ phone: '+237677123456', pin: '482915' });
      });
      expect(screen.getByTestId('expired')).toHaveTextContent('false');
    });
  });
});
