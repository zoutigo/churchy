import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { VerifyEmail } from './VerifyEmail';

const verifyEmail = vi.hoisted(() => vi.fn());
const refreshUser = vi.fn();
vi.mock('@/lib/api/auth.api', () => ({ authApi: { verifyEmail } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ refreshUser }) }));

describe('VerifyEmail', () => {
  beforeEach(() => {
    verifyEmail.mockReset();
    refreshUser.mockReset();
  });

  it('valide le jeton dès l’ouverture puis confirme et met à jour le profil', async () => {
    verifyEmail.mockResolvedValue({ ok: true });
    render(<VerifyEmail token="abc" />);

    expect(screen.getByText('Vérification en cours...')).toBeInTheDocument();
    expect(await screen.findByText('Adresse email confirmée')).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledWith({ token: 'abc' });
    expect(refreshUser).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Accéder à mon espace' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('n’appelle l’API qu’une fois, même en mode strict de React (jeton à usage unique)', async () => {
    verifyEmail.mockResolvedValue({ ok: true });
    render(
      <StrictMode>
        <VerifyEmail token="abc" />
      </StrictMode>,
    );
    await screen.findByText('Adresse email confirmée');
    expect(verifyEmail).toHaveBeenCalledTimes(1);
  });

  it('affiche l’erreur de l’API (lien expiré ou déjà utilisé)', async () => {
    verifyEmail.mockRejectedValue(new Error('Lien invalide ou expiré'));
    render(<VerifyEmail token="abc" />);

    expect(await screen.findByText('Lien invalide ou expiré')).toBeInTheDocument();
    expect(screen.getByText("Impossible de confirmer l'adresse")).toBeInTheDocument();
  });

  it('signale un jeton manquant sans appeler l’API', async () => {
    render(<VerifyEmail token={undefined} />);
    await waitFor(() =>
      expect(screen.getByText('Lien invalide : le jeton est manquant.')).toBeInTheDocument(),
    );
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
