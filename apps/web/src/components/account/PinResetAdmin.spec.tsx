import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinResetAdmin } from './PinResetAdmin';

const adminPinResetLink = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
let role: string;
vi.mock('@/lib/api/auth.api', () => ({ authApi: { adminPinResetLink } }));
vi.mock('@/lib/notify', () => ({ notify }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'a1', role } }) }));

describe('PinResetAdmin', () => {
  beforeEach(() => {
    adminPinResetLink.mockReset();
    notify.success.mockReset();
    notify.error.mockReset();
    role = 'SUPER_ADMIN';
  });

  it('refuse l’accès à un utilisateur ordinaire, sans formulaire', () => {
    role = 'USER';
    render(<PinResetAdmin />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'réservée aux administrateurs de la plateforme',
    );
    expect(screen.queryByLabelText('Numéro de téléphone')).not.toBeInTheDocument();
  });

  it('crée le lien, l’affiche pour la personne concernée et annonce le succès', async () => {
    adminPinResetLink.mockResolvedValue({
      url: 'http://localhost:3200/fr/reinitialisation-pin?token=abc',
      expiresAt: '2026-10-06T10:00:00.000Z',
      firstName: 'Marie',
      lastName: 'Ngono',
    });
    render(<PinResetAdmin />);
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '677123456');
    await userEvent.click(screen.getByRole('button', { name: 'Créer le lien' }));

    await waitFor(() => expect(adminPinResetLink).toHaveBeenCalledWith({ phone: '+237677123456' }));
    const result = await screen.findByTestId('pin-reset-result');
    expect(result).toHaveTextContent('Marie Ngono');
    expect(screen.getByLabelText('Lien de réinitialisation')).toHaveValue(
      'http://localhost:3200/fr/reinitialisation-pin?token=abc',
    );
    expect(notify.success).toHaveBeenCalledWith('Lien créé');
  });

  it('numéro sans compte : message d’erreur et toast, aucun lien affiché', async () => {
    adminPinResetLink.mockRejectedValue(new Error('Aucun compte avec ce numéro'));
    render(<PinResetAdmin />);
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '677123456');
    await userEvent.click(screen.getByRole('button', { name: 'Créer le lien' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Aucun compte avec ce numéro');
    expect(notify.error).toHaveBeenCalled();
    expect(screen.queryByTestId('pin-reset-result')).not.toBeInTheDocument();
  });

  it('numéro incomplet : validation côté formulaire', async () => {
    render(<PinResetAdmin />);
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '677');
    await userEvent.click(screen.getByRole('button', { name: 'Créer le lien' }));
    expect(await screen.findByText('Numéro de téléphone invalide')).toBeInTheDocument();
    expect(adminPinResetLink).not.toHaveBeenCalled();
  });

  it('copie le lien et l’annonce', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    adminPinResetLink.mockResolvedValue({
      url: 'http://x/fr/reinitialisation-pin?token=abc',
      expiresAt: '2026-10-06T10:00:00.000Z',
      firstName: 'M',
      lastName: 'N',
    });
    render(<PinResetAdmin />);
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '677123456');
    await userEvent.click(screen.getByRole('button', { name: 'Créer le lien' }));
    await userEvent.click(await screen.findByRole('button', { name: /Copier/ }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('http://x/fr/reinitialisation-pin?token=abc'),
    );
    expect(notify.success).toHaveBeenCalledWith('Lien copié');
  });
});
