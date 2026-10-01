import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from './ContactForm';

const sendContact = vi.fn();
vi.mock('@/lib/api/public.api', () => ({
  publicApi: { sendContact: (...a: unknown[]) => sendContact(...a) },
}));

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nom'), 'Marie Dupont');
  await user.type(screen.getByLabelText('Email'), 'marie@exemple.fr');
  await user.type(screen.getByLabelText('Message'), 'Bonjour, une question sur Churchy.');
}

describe('ContactForm', () => {
  beforeEach(() => {
    sendContact.mockReset();
  });

  it('envoie le message validé, puis confirme', async () => {
    sendContact.mockResolvedValue({ sent: true });
    const user = userEvent.setup();
    render(<ContactForm defaultTopic="PARISH" />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Envoyer le message' }));

    await waitFor(() => expect(sendContact).toHaveBeenCalledTimes(1));
    expect(sendContact).toHaveBeenCalledWith({
      name: 'Marie Dupont',
      email: 'marie@exemple.fr',
      topic: 'PARISH',
      message: 'Bonjour, une question sur Churchy.',
      website: '',
    });
    expect(await screen.findByText('Message envoyé')).toBeInTheDocument();
  });

  it('n’envoie rien tant que le formulaire est invalide et montre les erreurs', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.type(screen.getByLabelText('Email'), 'pas-un-email');
    await user.type(screen.getByLabelText('Message'), 'court');
    await user.click(screen.getByRole('button', { name: 'Envoyer le message' }));

    expect(await screen.findByText('Email invalide')).toBeInTheDocument();
    expect(screen.getByText('Message trop court (min 10 caractères)')).toBeInTheDocument();
    expect(screen.getByText('Nom requis')).toBeInTheDocument();
    expect(sendContact).not.toHaveBeenCalled();
  });

  it('affiche l’erreur de l’API et garde la saisie', async () => {
    sendContact.mockRejectedValue(new Error('Trop de requêtes'));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Envoyer le message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de requêtes');
    expect(screen.getByLabelText('Nom')).toHaveValue('Marie Dupont');
  });

  it('le piège à robots est caché aux personnes (hors tabulation, masqué aux lecteurs d’écran)', () => {
    render(<ContactForm />);
    const trap = document.getElementById('contact-website') as HTMLInputElement;
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
