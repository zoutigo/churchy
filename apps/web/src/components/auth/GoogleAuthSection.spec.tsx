import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { GoogleAuthSection, resetGoogleProvidersForTests } from './GoogleAuthSection';

const push = vi.fn();
const refresh = vi.fn();
const loginGoogle = vi.fn();
const linkGoogleWithPassword = vi.fn();
const providers = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
let emitCredential: ((token: string) => void) | undefined;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ loginGoogle, linkGoogleWithPassword, loading: false }),
}));
vi.mock('@/lib/api/auth.api', () => ({ authApi: { providers } }));
vi.mock('@/lib/notify', () => ({ notify }));
vi.mock('@/components/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: (props: {
    clientId: string;
    onCredential: (t: string) => void;
    text?: string;
  }) => {
    emitCredential = props.onCredential;
    return <div data-testid="google-button" data-client={props.clientId} data-text={props.text} />;
  },
}));

describe('GoogleAuthSection', () => {
  beforeEach(() => {
    resetGoogleProvidersForTests();
    [
      push,
      refresh,
      loginGoogle,
      linkGoogleWithPassword,
      providers,
      notify.success,
      notify.error,
    ].forEach((m) => m.mockReset());
    emitCredential = undefined;
  });

  it('n’affiche rien quand Google n’est pas configuré côté serveur', async () => {
    providers.mockResolvedValue({ google: null });
    const { container } = render(<GoogleAuthSection />);
    await waitFor(() => expect(providers).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('n’affiche rien non plus si l’API est injoignable (la connexion classique reste possible)', async () => {
    providers.mockRejectedValue(new Error('réseau'));
    const { container } = render(<GoogleAuthSection />);
    await waitFor(() => expect(providers).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('affiche le bouton Google avec l’identifiant client du serveur, puis « ou »', async () => {
    providers.mockResolvedValue({ google: { clientId: 'cid.apps.googleusercontent.com' } });
    render(<GoogleAuthSection text="signin_with" />);
    const button = await screen.findByTestId('google-button');
    expect(button).toHaveAttribute('data-client', 'cid.apps.googleusercontent.com');
    expect(button).toHaveAttribute('data-text', 'signin_with');
    expect(screen.getByText('ou')).toBeInTheDocument();
  });

  it('connecte avec le jeton de Google (et la langue) puis redirige', async () => {
    providers.mockResolvedValue({ google: { clientId: 'cid' } });
    loginGoogle.mockResolvedValue({ user: { id: 'u1' } });
    render(<GoogleAuthSection next="/dashboard/parishes" />);
    await screen.findByTestId('google-button');
    emitCredential?.('id.token.google');
    await waitFor(() =>
      expect(loginGoogle).toHaveBeenCalledWith({ idToken: 'id.token.google', locale: 'fr' }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/parishes'));
  });

  it('un administrateur de plateforme connecté avec Google arrive sur /platform', async () => {
    providers.mockResolvedValue({ google: { clientId: 'cid' } });
    loginGoogle.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } });
    render(<GoogleAuthSection />);
    await screen.findByTestId('google-button');
    emitCredential?.('id.token.google');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/platform'));
  });

  it('transmet la langue anglaise', async () => {
    setTestLocale('en');
    providers.mockResolvedValue({ google: { clientId: 'cid' } });
    loginGoogle.mockResolvedValue({ user: { id: 'u1' } });
    render(<GoogleAuthSection />);
    await screen.findByTestId('google-button');
    emitCredential?.('t');
    await waitFor(() => expect(loginGoogle).toHaveBeenCalledWith({ idToken: 't', locale: 'en' }));
    expect(screen.getByText('or')).toBeInTheDocument();
  });

  it('échec de connexion : toast d’erreur, pas de redirection', async () => {
    providers.mockResolvedValue({ google: { clientId: 'cid' } });
    loginGoogle.mockRejectedValue(new Error('Connexion Google refusée. Réessayez.'));
    render(<GoogleAuthSection />);
    await screen.findByTestId('google-button');
    emitCredential?.('bad');
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  describe('un compte existe déjà avec cet email', () => {
    const open = async () => {
      providers.mockResolvedValue({ google: { clientId: 'cid' } });
      loginGoogle.mockResolvedValue({ linkRequired: 'jean@gmail.com' });
      render(<GoogleAuthSection />);
      await screen.findByTestId('google-button');
      emitCredential?.('id.token');
      return screen.findByRole('dialog');
    };

    it('demande le mot de passe du compte au lieu de se connecter', async () => {
      const dialog = await open();
      expect(dialog).toHaveTextContent('jean@gmail.com');
      expect(push).not.toHaveBeenCalled();
    });

    it('lie avec le bon mot de passe, annonce le succès (toast) et redirige', async () => {
      linkGoogleWithPassword.mockResolvedValue({ id: 'u1' });
      await open();
      await userEvent.type(screen.getByLabelText('Mot de passe'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: 'Lier et me connecter' }));
      await waitFor(() =>
        expect(linkGoogleWithPassword).toHaveBeenCalledWith({
          idToken: 'id.token',
          password: 'password123',
        }),
      );
      expect(notify.success).toHaveBeenCalledWith('Compte Google lié');
      expect(push).toHaveBeenCalledWith('/dashboard');
    });

    it('mauvais mot de passe : erreur dans la boîte, toast d’erreur, aucune redirection', async () => {
      linkGoogleWithPassword.mockRejectedValue(new Error('Identifiants invalides'));
      await open();
      await userEvent.type(screen.getByLabelText('Mot de passe'), 'faux');
      await userEvent.click(screen.getByRole('button', { name: 'Lier et me connecter' }));
      expect(await screen.findByText('Identifiants invalides')).toBeInTheDocument();
      expect(notify.error).toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    });

    it('exige un mot de passe', async () => {
      await open();
      await userEvent.click(screen.getByRole('button', { name: 'Lier et me connecter' }));
      expect(await screen.findByText('Mot de passe requis')).toBeInTheDocument();
      expect(linkGoogleWithPassword).not.toHaveBeenCalled();
    });

    it('annuler ferme la boîte sans rien lier', async () => {
      await open();
      await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(linkGoogleWithPassword).not.toHaveBeenCalled();
    });

    it('propose « Mot de passe oublié ? »', async () => {
      await open();
      expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' })).toHaveAttribute(
        'href',
        '/fr/mot-de-passe-oublie',
      );
    });
  });
});
