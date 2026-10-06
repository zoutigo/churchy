import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { PhoneLoginForm } from './PhoneLoginForm';

const push = vi.fn();
const refresh = vi.fn();
const loginPhone = vi.fn();
let loading = false;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ loginPhone, loading }) }));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const fill = async (phone = '677123456', pin = '482915') => {
  await userEvent.type(screen.getByLabelText('Numéro de téléphone'), phone);
  await userEvent.type(screen.getByLabelText('PIN', { exact: true }), pin);
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
};

describe('PhoneLoginForm', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    loginPhone.mockReset();
    loading = false;
  });

  it('se connecte avec le numéro international et le PIN, puis redirige', async () => {
    loginPhone.mockResolvedValue({});
    render(<PhoneLoginForm />);
    await fill();
    await waitFor(() =>
      expect(loginPhone).toHaveBeenCalledWith({ phone: '+237677123456', pin: '482915' }),
    );
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('redirige vers la destination demandée (?next=)', async () => {
    loginPhone.mockResolvedValue({});
    render(<PhoneLoginForm next="/dashboard/parishes" />);
    await fill();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/parishes'));
  });

  it('un administrateur de plateforme arrive sur /platform ; un compte ordinaire sur /dashboard', async () => {
    loginPhone.mockResolvedValue({ id: 'u1', role: 'MODERATOR' });
    const { unmount } = render(<PhoneLoginForm />);
    await fill();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/platform'));
    unmount();
    push.mockReset();
    loginPhone.mockResolvedValue({ id: 'u2', role: 'USER' });
    render(<PhoneLoginForm />);
    await fill();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('numéro incomplet : erreur sous le champ et rien n’est envoyé', async () => {
    render(<PhoneLoginForm />);
    await fill('6771', '482915');
    expect(await screen.findByText('Numéro de téléphone invalide')).toBeInTheDocument();
    expect(loginPhone).not.toHaveBeenCalled();
  });

  it('PIN vide : erreur sous le champ', async () => {
    render(<PhoneLoginForm />);
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '677123456');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText('Code PIN requis')).toBeInTheDocument();
    expect(loginPhone).not.toHaveBeenCalled();
  });

  it('affiche l’erreur de l’API et ne redirige pas', async () => {
    loginPhone.mockRejectedValue(new Error('Identifiants invalides'));
    render(<PhoneLoginForm />);
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants invalides');
    expect(push).not.toHaveBeenCalled();
  });

  it('trop de tentatives : le message de l’API est affiché', async () => {
    loginPhone.mockRejectedValue(new Error('Trop de tentatives. Réessayez dans quelques minutes.'));
    render(<PhoneLoginForm />);
    await fill();
    expect(await screen.findByText(/Trop de tentatives/)).toBeInTheDocument();
  });

  it('désactive le bouton pendant le chargement', () => {
    loading = true;
    render(<PhoneLoginForm />);
    expect(screen.getByRole('button', { name: 'Connexion...' })).toBeDisabled();
  });

  it('propose « PIN oublié ? » vers la page de récupération', () => {
    render(<PhoneLoginForm />);
    expect(screen.getByRole('link', { name: 'PIN oublié ?' })).toHaveAttribute(
      'href',
      '/fr/pin-oublie',
    );
  });

  it('en anglais : libellés et lien traduits', () => {
    setTestLocale('en');
    render(<PhoneLoginForm />);
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot PIN?' })).toHaveAttribute(
      'href',
      '/en/forgot-pin',
    );
  });
});
