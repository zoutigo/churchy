import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

const push = vi.fn();
const refresh = vi.fn();
const login = vi.fn();
let loading = false;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login, loading }) }));

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
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

  it('redirige vers la destination demandée (?next=) après connexion', async () => {
    login.mockResolvedValue({});
    const user = userEvent.setup();
    render(<LoginForm next="/dashboard/parishes" />);

    await user.type(screen.getByLabelText('Email'), 'jean@paroisse.fr');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/parishes'));
  });

  it('propose le lien « Mot de passe oublié ? »', () => {
    render(<LoginForm />);
    expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('permet d’afficher puis de masquer le mot de passe', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = screen.getByLabelText('Mot de passe');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('marque les champs invalides (aria-invalid → bordure rouge) à la soumission', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Email invalide')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('aria-invalid', 'true');
    expect(login).not.toHaveBeenCalled();
  });
});
