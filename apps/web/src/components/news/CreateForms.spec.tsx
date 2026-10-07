import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateActivityForm } from './CreateActivityForm';
import { CreateAnnouncementForm } from './CreateAnnouncementForm';

const createAnnouncement = vi.fn();
const createActivity = vi.fn();
vi.mock('@/lib/api/announcements.api', () => ({
  announcementsApi: { create: (...a: unknown[]) => createAnnouncement(...a) },
}));
vi.mock('@/lib/api/activities.api', () => ({
  activitiesApi: { create: (...a: unknown[]) => createActivity(...a) },
}));

describe('CreateAnnouncementForm', () => {
  beforeEach(() => {
    createAnnouncement.mockReset();
  });

  it('publie l’annonce dans la paroisse et signale le succès', async () => {
    createAnnouncement.mockResolvedValue({});
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<CreateAnnouncementForm parishId="p1" onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText('Titre'), 'Horaires');
    await user.type(screen.getByLabelText('Contenu'), 'Nouveaux horaires');
    await user.click(screen.getByRole('button', { name: 'Publier l’annonce' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(createAnnouncement).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ title: 'Horaires', body: '<p>Nouveaux horaires</p>' }),
    );
  });

  it('envoie « Tout le monde » par défaut, ou « Paroissiens seulement » si on le choisit', async () => {
    createAnnouncement.mockResolvedValue({});
    const user = userEvent.setup();
    render(<CreateAnnouncementForm parishId="p1" />);
    expect(screen.getByRole('radio', { name: /Tout le monde/ })).toBeChecked();
    await user.type(screen.getByLabelText('Titre'), 'Entre nous');
    await user.type(screen.getByLabelText('Contenu'), 'Texte');
    await user.click(screen.getByRole('radio', { name: /Paroissiens seulement/ }));
    await user.click(screen.getByRole('button', { name: 'Publier l’annonce' }));
    await waitFor(() => expect(createAnnouncement).toHaveBeenCalledTimes(1));
    expect(createAnnouncement.mock.calls[0][1]).toMatchObject({ visibility: 'MEMBERS' });
  });

  it('refuse une image qui n’est pas en http(s)', async () => {
    const user = userEvent.setup();
    render(<CreateAnnouncementForm parishId="p1" />);
    await user.type(screen.getByLabelText('Titre'), 'T');
    await user.type(screen.getByLabelText('Contenu'), 'C');
    await user.type(screen.getByLabelText(/Adresse d’une image/), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'Publier l’annonce' }));
    expect(await screen.findByText('Adresse web invalide')).toBeInTheDocument();
    expect(createAnnouncement).not.toHaveBeenCalled();
  });

  it('affiche l’erreur de l’API', async () => {
    createAnnouncement.mockRejectedValue(new Error('Accès refusé pour cette paroisse'));
    const user = userEvent.setup();
    render(<CreateAnnouncementForm parishId="p1" />);
    await user.type(screen.getByLabelText('Titre'), 'T');
    await user.type(screen.getByLabelText('Contenu'), 'C');
    await user.click(screen.getByRole('button', { name: 'Publier l’annonce' }));
    expect(await screen.findByText('Accès refusé pour cette paroisse')).toBeInTheDocument();
  });
});

describe('CreateActivityForm', () => {
  beforeEach(() => {
    createActivity.mockReset();
  });

  it('convertit la date saisie (heure locale) en ISO UTC avant l’envoi', async () => {
    createActivity.mockResolvedValue({});
    const user = userEvent.setup();
    render(<CreateActivityForm parishId="p1" />);
    await user.type(screen.getByLabelText('Titre'), 'Retraite');
    await user.type(screen.getByLabelText('Description'), 'Week-end');
    await user.type(screen.getByLabelText('Date et heure'), '2026-11-01T18:00');
    await user.click(screen.getByRole('button', { name: 'Publier l’activité' }));

    await waitFor(() => expect(createActivity).toHaveBeenCalledTimes(1));
    const [parishId, dto] = createActivity.mock.calls[0];
    expect(parishId).toBe('p1');
    expect(dto.startsAt).toBe(new Date(2026, 10, 1, 18, 0).toISOString());
  });

  it('propose aussi la visibilité « Paroissiens seulement »', async () => {
    createActivity.mockResolvedValue({});
    const user = userEvent.setup();
    render(<CreateActivityForm parishId="p1" />);
    await user.type(screen.getByLabelText('Titre'), 'Retraite');
    await user.type(screen.getByLabelText('Description'), 'Week-end');
    await user.type(screen.getByLabelText('Date et heure'), '2026-11-01T18:00');
    await user.click(screen.getByRole('radio', { name: /Paroissiens seulement/ }));
    await user.click(screen.getByRole('button', { name: 'Publier l’activité' }));
    await waitFor(() => expect(createActivity).toHaveBeenCalledTimes(1));
    expect(createActivity.mock.calls[0][1]).toMatchObject({ visibility: 'MEMBERS' });
  });

  it('exige une date', async () => {
    const user = userEvent.setup();
    render(<CreateActivityForm parishId="p1" />);
    await user.type(screen.getByLabelText('Titre'), 'Retraite');
    await user.type(screen.getByLabelText('Description'), 'Week-end');
    await user.click(screen.getByRole('button', { name: 'Publier l’activité' }));
    expect(await screen.findByText('Date et heure requises')).toBeInTheDocument();
    expect(createActivity).not.toHaveBeenCalled();
  });
});
