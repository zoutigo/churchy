import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setTestLocale } from '../../../vitest.setup';
import { GoogleSignInButton } from './GoogleSignInButton';

const load = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/google-identity', () => ({ loadGoogleIdentity: load }));

describe('GoogleSignInButton', () => {
  const initialize = vi.fn();
  const renderButton = vi.fn();

  beforeEach(() => {
    initialize.mockReset();
    renderButton.mockReset();
    load.mockReset().mockResolvedValue({ accounts: { id: { initialize, renderButton } } });
  });

  it('initialise Google avec NOTRE identifiant client et dessine le bouton officiel', async () => {
    render(
      <GoogleSignInButton
        clientId="cid.apps.googleusercontent.com"
        onCredential={() => undefined}
      />,
    );
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'cid.apps.googleusercontent.com' }),
    );
    expect(renderButton.mock.calls[0][0]).toBe(screen.getByTestId('google-button'));
    expect(renderButton.mock.calls[0][1]).toMatchObject({ locale: 'fr', text: 'continue_with' });
  });

  it('transmet le jeton d’identité reçu de Google', async () => {
    const onCredential = vi.fn();
    render(<GoogleSignInButton clientId="cid" onCredential={onCredential} />);
    await waitFor(() => expect(initialize).toHaveBeenCalled());
    initialize.mock.calls[0][0].callback({ credential: 'jwt.google' });
    expect(onCredential).toHaveBeenCalledWith('jwt.google');
  });

  it('ignore une réponse sans jeton', async () => {
    const onCredential = vi.fn();
    render(<GoogleSignInButton clientId="cid" onCredential={onCredential} />);
    await waitFor(() => expect(initialize).toHaveBeenCalled());
    initialize.mock.calls[0][0].callback({});
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('bouton dans la langue de l’interface', async () => {
    setTestLocale('en');
    render(<GoogleSignInButton clientId="cid" onCredential={() => undefined} text="signup_with" />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(renderButton.mock.calls[0][1]).toMatchObject({ locale: 'en', text: 'signup_with' });
  });

  it('script Google injoignable : message discret, la page reste utilisable', async () => {
    load.mockRejectedValue(new Error('bloqué'));
    render(<GoogleSignInButton clientId="cid" onCredential={() => undefined} />);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Google est momentanément indisponible',
    );
  });
});
