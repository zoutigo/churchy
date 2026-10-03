/**
 * Retour d'information après envoi, identique pour tous les formulaires : toast de succès ;
 * erreur API → message dans le formulaire + toast d'erreur, sans toast de succès.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Parish } from '@churchy/shared';
import { ApiError } from '@/lib/api/client';
import { CreateParishForm } from './parish/CreateParishForm';
import { ParishInfoForm } from './parish/ParishInfoForm';
import { CreateAnnouncementForm } from './news/CreateAnnouncementForm';
import { CreateActivityForm } from './news/CreateActivityForm';
import { ContactForm } from './public/ContactForm';

const api = {
  createParish: vi.fn(),
  updateParish: vi.fn(),
  createAnnouncement: vi.fn(),
  createActivity: vi.fn(),
  sendContact: vi.fn(),
};
vi.mock('@/lib/api/parishes.api', () => ({
  parishesApi: {
    create: (...a: unknown[]) => api.createParish(...a),
    update: (...a: unknown[]) => api.updateParish(...a),
  },
}));
vi.mock('@/lib/api/announcements.api', () => ({
  announcementsApi: { create: (...a: unknown[]) => api.createAnnouncement(...a) },
}));
vi.mock('@/lib/api/activities.api', () => ({
  activitiesApi: { create: (...a: unknown[]) => api.createActivity(...a) },
}));
vi.mock('@/lib/api/public.api', () => ({
  publicApi: { sendContact: (...a: unknown[]) => api.sendContact(...a) },
}));
const success = vi.fn();
const error = vi.fn();
vi.mock('@/lib/notify', () => ({
  notify: {
    success: (...a: unknown[]) => success(...a),
    error: (...a: unknown[]) => error(...a),
  },
}));

const parish = {
  id: 'p1',
  name: 'Saint-Pierre',
  city: 'Lyon',
  country: 'France',
  address: '1 rue Neuve',
  phone: null,
  timezone: 'Europe/Paris',
} as Parish;

const flows = {
  'création de paroisse': {
    failTitle: 'Erreur lors de la création',
    mock: api.createParish,
    ok: {},
    render: () => render(<CreateParishForm />),
    fill: async (u: ReturnType<typeof userEvent.setup>) => {
      await u.type(screen.getByLabelText('Nom de la paroisse'), 'Saint Joseph');
      await u.selectOptions(screen.getByLabelText('Pays'), 'France');
      await u.type(screen.getByLabelText('Ville'), 'Nantes');
    },
    submit: 'Créer la paroisse',
    successTitle: 'Paroisse créée',
  },
  'modification de la paroisse': {
    failTitle: 'Erreur lors de l’enregistrement',
    mock: api.updateParish,
    ok: parish,
    render: () => render(<ParishInfoForm parish={parish} />),
    fill: async (u: ReturnType<typeof userEvent.setup>) => {
      await u.type(screen.getByLabelText('Adresse'), ' bis');
    },
    submit: 'Enregistrer',
    successTitle: 'Paroisse mise à jour',
  },
  'publication d’une annonce': {
    failTitle: 'Erreur lors de la publication',
    mock: api.createAnnouncement,
    ok: {},
    render: () => render(<CreateAnnouncementForm parishId="p1" />),
    fill: async (u: ReturnType<typeof userEvent.setup>) => {
      await u.type(screen.getByLabelText('Titre'), 'Horaires');
      await u.type(screen.getByLabelText('Contenu'), 'Nouveaux horaires');
    },
    submit: 'Publier l’annonce',
    successTitle: 'Annonce publiée',
  },
  'publication d’une activité': {
    failTitle: 'Erreur lors de la publication',
    mock: api.createActivity,
    ok: {},
    render: () => render(<CreateActivityForm parishId="p1" />),
    fill: async (u: ReturnType<typeof userEvent.setup>) => {
      await u.type(screen.getByLabelText('Titre'), 'Retraite');
      await u.type(screen.getByLabelText('Description'), 'Week-end');
      await u.type(screen.getByLabelText('Date et heure'), '2026-11-01T18:00');
    },
    submit: 'Publier l’activité',
    successTitle: 'Activité publiée',
  },
  'message de contact': {
    failTitle: 'Le message n’a pas pu être envoyé. Réessayez.',
    mock: api.sendContact,
    ok: { sent: true },
    render: () => render(<ContactForm />),
    fill: async (u: ReturnType<typeof userEvent.setup>) => {
      await u.type(screen.getByLabelText('Nom'), 'Marie Dupont');
      await u.type(screen.getByLabelText('Email'), 'marie@exemple.fr');
      await u.type(screen.getByLabelText('Message'), 'Bonjour, une question sur Churchy.');
    },
    submit: 'Envoyer le message',
    successTitle: 'Message transmis',
  },
};

beforeEach(() => {
  for (const m of [...Object.values(api), success, error]) m.mockReset();
});

describe.each(Object.entries(flows))('%s', (_name, flow) => {
  it('affiche un toast de succès', async () => {
    flow.mock.mockResolvedValue(flow.ok);
    const user = userEvent.setup();
    flow.render();
    await flow.fill(user);
    await user.click(screen.getByRole('button', { name: flow.submit }));

    await waitFor(() => expect(success.mock.calls[0]?.[0]).toBe(flow.successTitle));
    expect(error).not.toHaveBeenCalled();
  });

  it('erreur du serveur : message dans le formulaire + toast d’erreur, pas de toast de succès', async () => {
    flow.mock.mockRejectedValue(new ApiError('Le serveur a refusé', 500));
    const user = userEvent.setup();
    flow.render();
    await flow.fill(user);
    await user.click(screen.getByRole('button', { name: flow.submit }));

    expect(await screen.findByText('Le serveur a refusé')).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith(flow.failTitle, 'Le serveur a refusé');
    expect(success).not.toHaveBeenCalled();
  });

  it('serveur injoignable : message explicite et le bouton redevient actif', async () => {
    flow.mock.mockRejectedValue(
      new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion.', 0),
    );
    const user = userEvent.setup();
    flow.render();
    await flow.fill(user);
    await user.click(screen.getByRole('button', { name: flow.submit }));

    expect(await screen.findByText(/Impossible de joindre le serveur/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: flow.submit })).toBeEnabled();
    expect(success).not.toHaveBeenCalled();
  });
});

describe('erreurs de validation renvoyées par l’API (Zod côté serveur)', () => {
  it('s’affichent sous le champ concerné (annonce)', async () => {
    api.createAnnouncement.mockRejectedValue(
      new ApiError('Titre trop long', 400, { title: ['Titre trop long (serveur)'] }),
    );
    const user = userEvent.setup();
    flows['publication d’une annonce'].render();
    await flows['publication d’une annonce'].fill(user);
    await user.click(screen.getByRole('button', { name: 'Publier l’annonce' }));

    expect(await screen.findByText('Titre trop long (serveur)')).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toHaveAttribute('aria-invalid', 'true');
    expect(success).not.toHaveBeenCalled();
  });

  it('s’affichent sous le champ concerné (paroisse)', async () => {
    api.createParish.mockRejectedValue(
      new ApiError('Nom déjà pris', 400, { name: ['Nom déjà pris (serveur)'] }),
    );
    const user = userEvent.setup();
    flows['création de paroisse'].render();
    await flows['création de paroisse'].fill(user);
    await user.click(screen.getByRole('button', { name: 'Créer la paroisse' }));
    expect(await screen.findByText('Nom déjà pris (serveur)')).toBeInTheDocument();
  });
});
