import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ParishDetailPage from './page';
import AnnouncementsPage from './announcements/page';

const membership = vi.fn();
const findById = vi.fn();
const findAnnouncements = vi.fn();
vi.mock('@/lib/api/parishes.api', () => ({
  parishesApi: {
    membership: (...a: unknown[]) => membership(...a),
    findById: (...a: unknown[]) => findById(...a),
  },
}));
vi.mock('@/lib/api/announcements.api', () => ({
  announcementsApi: { findByParish: (...a: unknown[]) => findAnnouncements(...a), remove: vi.fn() },
}));
let auth: { user: { id: string; role: string } | null; initializing: boolean };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/components/favorites/FavoriteButton', () => ({
  FavoriteButton: () => <button>favori</button>,
}));
vi.mock('@/components/parish/FollowButton', () => ({
  FollowButton: () => <button>suivre</button>,
}));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const parish = { id: 'p1', name: 'Saint-Pierre', city: 'Douala', country: 'Cameroun' };

beforeEach(() => {
  for (const m of [membership, findById, findAnnouncements]) m.mockReset();
  findById.mockResolvedValue(parish);
  findAnnouncements.mockResolvedValue([]);
  auth = { user: { id: 'u1', role: 'USER' }, initializing: false };
});

const sectionLinks = () =>
  screen
    .queryAllByRole('link')
    .map((l) => l.getAttribute('href'))
    .filter((h) => h?.startsWith('/dashboard/parishes/p1/'));

describe('vue d’une paroisse dans le tableau de bord', () => {
  it('fidèle : lecture seule, annonces et activités seulement, pas de modification', async () => {
    membership.mockResolvedValue({ status: 'FAITHFUL', duties: [] });
    render(<ParishDetailPage params={{ parishId: 'p1' }} />);
    expect(await screen.findByText(/réservée à ses administrateurs/)).toBeInTheDocument();
    expect(sectionLinks()).toEqual([
      '/dashboard/parishes/p1/announcements',
      '/dashboard/parishes/p1/activities',
    ]);
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'suivre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'favori' })).toBeInTheDocument();
  });

  it('lecteur : voit aussi les données internes, sans pouvoir modifier la paroisse', async () => {
    membership.mockResolvedValue({ status: 'PARISHIONER', duties: ['READER'] });
    render(<ParishDetailPage params={{ parishId: 'p1' }} />);
    await waitFor(() => expect(sectionLinks()).toHaveLength(5));
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
  });

  it('administrateur : tout, y compris la modification', async () => {
    membership.mockResolvedValue({ status: 'PARISH_ADMIN', duties: [] });
    render(<ParishDetailPage params={{ parishId: 'p1' }} />);
    await waitFor(() => expect(sectionLinks()).toHaveLength(5));
    expect(await screen.findByRole('button', { name: 'Modifier' })).toBeInTheDocument();
    expect(screen.queryByText(/réservée à ses administrateurs/)).not.toBeInTheDocument();
  });

  it('SUPER_ADMIN sans appartenance : tout est proposé', async () => {
    auth = { user: { id: 'u1', role: 'SUPER_ADMIN' }, initializing: false };
    membership.mockResolvedValue({ status: null, duties: [] });
    render(<ParishDetailPage params={{ parishId: 'p1' }} />);
    await waitFor(() => expect(sectionLinks()).toHaveLength(5));
  });

  it('ADMIN de plateforme sans appartenance : lecture des données internes, pas de modification', async () => {
    auth = { user: { id: 'u1', role: 'ADMIN' }, initializing: false };
    membership.mockResolvedValue({ status: null, duties: [] });
    render(<ParishDetailPage params={{ parishId: 'p1' }} />);
    await waitFor(() => expect(sectionLinks()).toHaveLength(5));
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
  });
});

describe('annonces dans le tableau de bord', () => {
  const item = {
    id: 'a1',
    title: 'Messe de rentrée',
    visibility: 'MEMBERS',
    publishedAt: '2026-10-01T10:00:00.000Z',
  };

  it('paroissien : voit l’annonce « Paroissiens seulement », sans ajouter ni supprimer', async () => {
    membership.mockResolvedValue({ status: 'PARISHIONER', duties: [] });
    findAnnouncements.mockResolvedValue([item]);
    render(<AnnouncementsPage params={{ parishId: 'p1' }} />);
    expect(await screen.findByText('Messe de rentrée')).toBeInTheDocument();
    expect(screen.getByText('Paroissiens seulement')).toBeInTheDocument();
    await waitFor(() => expect(membership).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Ajouter|Nouvelle/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Supprimer/ })).not.toBeInTheDocument();
  });

  it('rédacteur : peut ajouter et supprimer', async () => {
    membership.mockResolvedValue({ status: 'PARISHIONER', duties: ['ANNOUNCER'] });
    findAnnouncements.mockResolvedValue([item]);
    render(<AnnouncementsPage params={{ parishId: 'p1' }} />);
    expect(await screen.findByRole('button', { name: /Supprimer/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button').some((b) => /annonce/i.test(b.textContent ?? ''))).toBe(
      true,
    );
  });
});
