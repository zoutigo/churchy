import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordForm } from './ResetPasswordForm';

const push = vi.fn();
const resetPassword = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api/auth.api', () => ({ authApi: { resetPassword } }));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    push.mockReset();
    resetPassword.mockReset();
  });

  const fill = async (password: string, confirm: string) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nouveau mot de passe'), password);
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), confirm);
    await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }));
  };

  it('refuse un mot de passe trop court', async () => {
    render(<ResetPasswordForm token="tok" />);
    await fill('court', 'court');
    expect(await screen.findByText('Minimum 8 caractères')).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('refuse deux mots de passe différents et marque le champ en erreur', async () => {
    render(<ResetPasswordForm token="tok" />);
    await fill('password123', 'different456');
    expect(await screen.findByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmer le mot de passe')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('envoie le jeton et le nouveau mot de passe, puis redirige vers la connexion', async () => {
    resetPassword.mockResolvedValue({ ok: true });
    render(<ResetPasswordForm token="le-jeton" />);
    await fill('nouveaumdp1', 'nouveaumdp1');

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({ token: 'le-jeton', password: 'nouveaumdp1' }),
    );
    expect(push).toHaveBeenCalledWith('/login?reset=1');
  });

  it('affiche l’erreur d’un lien expiré avec un lien pour en redemander un', async () => {
    resetPassword.mockRejectedValue(new Error('Lien invalide ou expiré'));
    render(<ResetPasswordForm token="perime" />);
    await fill('nouveaumdp1', 'nouveaumdp1');

    expect(await screen.findByText('Lien invalide ou expiré')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demander un nouveau lien' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(push).not.toHaveBeenCalled();
  });
});
