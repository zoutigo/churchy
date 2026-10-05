import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { ForgotPinForm } from './ForgotPinForm';

const forgotPin = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/api/auth.api', () => ({ authApi: { forgotPin } }));
vi.mock('@/lib/notify', () => ({ notify }));

const submit = async (phone = '677123456') => {
  await userEvent.type(screen.getByLabelText('Numéro de téléphone'), phone);
  await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }));
};

describe('ForgotPinForm', () => {
  beforeEach(() => {
    forgotPin.mockReset();
    notify.success.mockReset();
    notify.error.mockReset();
  });

  it('envoie le numéro international, annonce la demande (toast) sans dire si le compte existe', async () => {
    forgotPin.mockResolvedValue({ ok: true });
    render(<ForgotPinForm />);
    await submit();
    await waitFor(() => expect(forgotPin).toHaveBeenCalledWith({ phone: '+237677123456' }));
    expect(
      await screen.findByText('Demande enregistrée', { selector: '[class*="font-medium"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Si ce numéro a un compte/)).toBeInTheDocument();
    expect(notify.success).toHaveBeenCalled();
  });

  it('explique quoi faire sans email confirmé (administrateur)', async () => {
    forgotPin.mockResolvedValue({ ok: true });
    render(<ForgotPinForm />);
    await submit();
    expect(await screen.findByText(/Sans adresse email confirmée, contactez/)).toBeInTheDocument();
  });

  it('permet de recommencer avec un autre numéro', async () => {
    forgotPin.mockResolvedValue({ ok: true });
    render(<ForgotPinForm />);
    await submit();
    await userEvent.click(await screen.findByRole('button', { name: 'Utiliser un autre numéro' }));
    expect(screen.getByLabelText('Numéro de téléphone')).toBeInTheDocument();
  });

  it('numéro incomplet : erreur de validation, rien n’est envoyé', async () => {
    render(<ForgotPinForm />);
    await submit('677');
    expect(await screen.findByText('Numéro de téléphone invalide')).toBeInTheDocument();
    expect(forgotPin).not.toHaveBeenCalled();
  });

  it('trop de demandes : message + toast d’erreur, pas de toast de succès', async () => {
    forgotPin.mockRejectedValue(new Error('Trop de tentatives. Réessayez dans quelques minutes.'));
    render(<ForgotPinForm />);
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de tentatives');
    expect(notify.error).toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('en anglais', async () => {
    setTestLocale('en');
    forgotPin.mockResolvedValue({ ok: true });
    render(<ForgotPinForm />);
    await userEvent.type(screen.getByLabelText('Phone number'), '677123456');
    await userEvent.click(screen.getByRole('button', { name: 'Send the link' }));
    expect(await screen.findByText(/If this number has an account/)).toBeInTheDocument();
  });
});
