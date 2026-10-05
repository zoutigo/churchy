import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { PhoneRegisterForm } from './PhoneRegisterForm';

const push = vi.fn();
const refresh = vi.fn();
const registerPhone = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ registerPhone, loading: false }) }));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const fill = async (opts: { pin?: string; confirm?: string; phone?: string } = {}) => {
  const { pin = '482915', confirm = pin, phone = '677123456' } = opts;
  await userEvent.type(screen.getByLabelText('Prénom'), 'Marie');
  await userEvent.type(screen.getByLabelText('Nom', { exact: true }), 'Ngono');
  await userEvent.type(screen.getByLabelText('Numéro de téléphone'), phone);
  await userEvent.type(screen.getByLabelText('PIN', { exact: true }), pin);
  await userEvent.type(screen.getByLabelText('Confirmer le PIN'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
};

describe('PhoneRegisterForm', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    registerPhone.mockReset();
  });

  it('inscrit avec le numéro international, le PIN et la langue de l’interface', async () => {
    registerPhone.mockResolvedValue({});
    render(<PhoneRegisterForm />);
    await fill();
    await waitFor(() => expect(registerPhone).toHaveBeenCalled());
    expect(registerPhone.mock.calls[0][0]).toEqual({
      phone: '+237677123456',
      pin: '482915',
      firstName: 'Marie',
      lastName: 'Ngono',
      locale: 'fr',
    });
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('n’envoie jamais la confirmation du PIN', async () => {
    registerPhone.mockResolvedValue({});
    render(<PhoneRegisterForm />);
    await fill();
    await waitFor(() => expect(registerPhone).toHaveBeenCalled());
    expect(registerPhone.mock.calls[0][0]).not.toHaveProperty('confirmPin');
  });

  it('inscrit en anglais avec la langue en', async () => {
    setTestLocale('en');
    registerPhone.mockResolvedValue({});
    render(<PhoneRegisterForm />);
    await userEvent.type(screen.getByLabelText('First name'), 'Mary');
    await userEvent.type(screen.getByLabelText('Last name'), 'Smith');
    await userEvent.type(screen.getByLabelText('Phone number'), '677123456');
    await userEvent.type(screen.getByLabelText('PIN', { exact: true }), '482915');
    await userEvent.type(screen.getByLabelText('Confirm PIN'), '482915');
    await userEvent.click(screen.getByRole('button', { name: 'Create my account' }));
    await waitFor(() => expect(registerPhone).toHaveBeenCalled());
    expect(registerPhone.mock.calls[0][0]).toMatchObject({ locale: 'en' });
  });

  it('refuse deux PIN différents', async () => {
    render(<PhoneRegisterForm />);
    await fill({ pin: '482915', confirm: '482916' });
    expect(await screen.findByText('Les PIN ne correspondent pas')).toBeInTheDocument();
    expect(registerPhone).not.toHaveBeenCalled();
  });

  it.each([
    ['trop simple', '123456', 'PIN trop simple (évitez 123456 ou 000000)'],
    ['répété', '999999', 'PIN trop simple (évitez 123456 ou 000000)'],
  ])('refuse un PIN %s', async (_label, pin, message) => {
    render(<PhoneRegisterForm />);
    await fill({ pin });
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(registerPhone).not.toHaveBeenCalled();
  });

  it('refuse un PIN trop court', async () => {
    render(<PhoneRegisterForm />);
    await fill({ pin: '4829' });
    expect(
      await screen.findByText('Le PIN doit contenir exactement 6 chiffres'),
    ).toBeInTheDocument();
  });

  it('refuse un numéro incomplet', async () => {
    render(<PhoneRegisterForm />);
    await fill({ phone: '67712' });
    expect(await screen.findByText('Numéro de téléphone invalide')).toBeInTheDocument();
    expect(registerPhone).not.toHaveBeenCalled();
  });

  it('numéro déjà utilisé : l’erreur de l’API s’affiche et on reste sur la page', async () => {
    registerPhone.mockRejectedValue(new Error('Ce numéro est déjà utilisé'));
    render(<PhoneRegisterForm />);
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce numéro est déjà utilisé');
    expect(push).not.toHaveBeenCalled();
  });

  it('explique qu’un email pourra être ajouté plus tard', () => {
    render(<PhoneRegisterForm />);
    expect(screen.getByText(/ajouter une adresse email plus tard/)).toBeInTheDocument();
  });
});
