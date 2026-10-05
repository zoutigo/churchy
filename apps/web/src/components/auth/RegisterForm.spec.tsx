import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { RegisterForm } from './RegisterForm';

const push = vi.fn();
const refresh = vi.fn();
const register = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ register, loading: false }) }));

const LABELS = {
  fr: {
    first: 'Prénom',
    last: 'Nom',
    password: 'Mot de passe',
    confirm: 'Confirmer le mot de passe',
    submit: 'Créer mon compte',
  },
  en: {
    first: 'First name',
    last: 'Last name',
    password: 'Password',
    confirm: 'Confirm password',
    submit: 'Create my account',
  },
};

const fill = async (lang: 'fr' | 'en' = 'fr', confirm = 'motdepasse1') => {
  const l = LABELS[lang];
  await userEvent.type(screen.getByLabelText(l.first), 'Jean');
  await userEvent.type(screen.getByLabelText(l.last), 'Dupont');
  await userEvent.type(screen.getByLabelText('Email'), 'jean@paroisse.fr');
  await userEvent.type(screen.getByLabelText(l.password, { exact: true }), 'motdepasse1');
  await userEvent.type(screen.getByLabelText(l.confirm, { exact: true }), confirm);
  await userEvent.click(screen.getByRole('button', { name: l.submit }));
};

describe('RegisterForm : langue du compte', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    register.mockReset().mockResolvedValue({});
  });

  it('inscrit avec la langue de l’interface (français)', async () => {
    render(<RegisterForm />);
    await fill();
    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(register.mock.calls[0][0]).toMatchObject({ email: 'jean@paroisse.fr', locale: 'fr' });
  });

  it('inscrit avec la langue de l’interface (anglais)', async () => {
    setTestLocale('en');
    render(<RegisterForm />);
    await fill('en');
    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(register.mock.calls[0][0]).toMatchObject({ locale: 'en' });
    expect(push).toHaveBeenCalledWith('/dashboard');
  });
});

describe('RegisterForm : confirmation du mot de passe', () => {
  beforeEach(() => {
    register.mockReset().mockResolvedValue({});
  });

  it('refuse l’envoi quand les deux mots de passe diffèrent', async () => {
    setTestLocale('fr');
    render(<RegisterForm />);
    await fill('fr', 'autrechose12');
    expect(await screen.findByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('n’envoie jamais la confirmation à l’API', async () => {
    setTestLocale('fr');
    render(<RegisterForm />);
    await fill('fr');
    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(register.mock.calls[0][0]).not.toHaveProperty('confirmPassword');
  });

  it('affiche le message en anglais', async () => {
    setTestLocale('en');
    render(<RegisterForm />);
    await fill('en', 'different123');
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });
});
