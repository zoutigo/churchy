import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

const push = vi.fn();
const login = vi.fn();
let loading = false;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login, loading }) }));

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockReset();
    login.mockReset();
    loading = false;
  });

  it('signale un email invalide', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'pas-un-email');

    expect(await screen.findByText('Email invalide')).toBeInTheDocument();
  });

  it('se connecte puis redirige vers le dashboard', async () => {
    login.mockResolvedValue({});
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'jean@paroisse.fr');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({ email: 'jean@paroisse.fr', password: 'secret123' }),
    );
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('affiche l’erreur renvoyée par l’API et ne redirige pas', async () => {
    login.mockRejectedValue(new Error('Identifiants invalides'));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'jean@paroisse.fr');
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Identifiants invalides')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('désactive le bouton pendant le chargement', () => {
    loading = true;
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Connexion...' })).toBeDisabled();
  });
});
