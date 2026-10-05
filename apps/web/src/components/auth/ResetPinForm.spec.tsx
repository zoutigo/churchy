import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPinForm } from './ResetPinForm';

const push = vi.fn();
const resetPin = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api/auth.api', () => ({ authApi: { resetPin } }));
vi.mock('@/lib/notify', () => ({ notify }));

const fill = async (pin = '739104', confirm = pin) => {
  await userEvent.type(screen.getByLabelText('Nouveau PIN'), pin);
  await userEvent.type(screen.getByLabelText('Confirmer le PIN'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le PIN' }));
};

describe('ResetPinForm', () => {
  beforeEach(() => {
    push.mockReset();
    resetPin.mockReset();
    notify.success.mockReset();
    notify.error.mockReset();
  });

  it('envoie le jeton et le nouveau PIN (sans confirmation), annonce le succès, renvoie vers la connexion', async () => {
    resetPin.mockResolvedValue({ ok: true });
    render(<ResetPinForm token="abc" />);
    await fill();
    await waitFor(() => expect(resetPin).toHaveBeenCalledWith({ token: 'abc', pin: '739104' }));
    expect(notify.success).toHaveBeenCalledWith('PIN modifié');
    expect(push).toHaveBeenCalledWith('/fr/connexion?reset=pin');
  });

  it('refuse deux PIN différents', async () => {
    render(<ResetPinForm token="abc" />);
    await fill('739104', '739105');
    expect(await screen.findByText('Les PIN ne correspondent pas')).toBeInTheDocument();
    expect(resetPin).not.toHaveBeenCalled();
  });

  it('refuse un PIN trop simple', async () => {
    render(<ResetPinForm token="abc" />);
    await fill('123456');
    expect(await screen.findByText(/PIN trop simple/)).toBeInTheDocument();
    expect(resetPin).not.toHaveBeenCalled();
  });

  it('lien expiré ou déjà utilisé : message d’erreur, toast d’erreur, pas de redirection', async () => {
    resetPin.mockRejectedValue(new Error('Lien invalide ou expiré'));
    render(<ResetPinForm token="vieux" />);
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent('Lien invalide ou expiré');
    expect(notify.error).toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
