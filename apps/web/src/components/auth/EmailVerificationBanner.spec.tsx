import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailVerificationBanner } from './EmailVerificationBanner';

const resendVerification = vi.hoisted(() => vi.fn());
let user: { email: string; emailVerified: boolean } | null;
vi.mock('@/lib/api/auth.api', () => ({ authApi: { resendVerification } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user }) }));

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    resendVerification.mockReset();
    user = { email: 'jean@paroisse.fr', emailVerified: false };
  });

  it('ne s’affiche pas pour un email déjà confirmé ni hors connexion', () => {
    user = { email: 'jean@paroisse.fr', emailVerified: true };
    const { container, rerender } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();

    user = null;
    rerender(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('invite à confirmer l’adresse et renvoie le lien à la demande', async () => {
    resendVerification.mockResolvedValue({ ok: true });
    const u = userEvent.setup();
    render(<EmailVerificationBanner />);

    expect(screen.getByText('Confirmez votre adresse email')).toBeInTheDocument();
    expect(screen.getByText('jean@paroisse.fr')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Renvoyer le lien' }));

    expect(resendVerification).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(/nouveau lien vient d’être envoyé|nouveau lien vient d'être envoyé/),
    ).toBeInTheDocument();
  });

  it('signale l’échec d’envoi', async () => {
    resendVerification.mockRejectedValue(new Error('x'));
    const u = userEvent.setup();
    render(<EmailVerificationBanner />);

    await u.click(screen.getByRole('button', { name: 'Renvoyer le lien' }));

    expect(
      await screen.findByText('Envoi impossible, réessayez dans un instant.'),
    ).toBeInTheDocument();
  });
});
