import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordForm } from './ForgotPasswordForm';

const forgotPassword = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/auth.api', () => ({ authApi: { forgotPassword } }));

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    forgotPassword.mockReset();
  });

  it('refuse un email invalide sans appeler l’API', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText('Email'), 'pas-un-email');
    await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));

    expect(await screen.findByText('Email invalide')).toBeInTheDocument();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('envoie la demande puis affiche une confirmation neutre', async () => {
    forgotPassword.mockResolvedValue({ message: 'ok' });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText('Email'), 'Jean@Paroisse.fr');
    await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));

    // L'email est normalisé (minuscules) par le schéma partagé avant l'envoi.
    expect(forgotPassword).toHaveBeenCalledWith({ email: 'jean@paroisse.fr' });
    expect(await screen.findByText('Vérifiez votre boîte mail')).toBeInTheDocument();
    // Formulation conditionnelle : ne révèle pas si le compte existe.
    expect(screen.getByText(/Si un compte existe/)).toBeInTheDocument();
  });

  it('permet de recommencer avec une autre adresse', async () => {
    forgotPassword.mockResolvedValue({});
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText('Email'), 'jean@paroisse.fr');
    await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));

    await user.click(await screen.findByRole('button', { name: 'Utiliser une autre adresse' }));

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('affiche l’erreur si l’envoi échoue', async () => {
    forgotPassword.mockRejectedValue(new Error('Trop de requêtes'));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText('Email'), 'jean@paroisse.fr');
    await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));

    expect(await screen.findByText('Trop de requêtes')).toBeInTheDocument();
  });
});
