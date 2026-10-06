import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { ParishMembers } from './ParishMembers';

const api = vi.hoisted(() => ({
  membership: vi.fn(),
  members: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
}));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
let me: { id: string; role: string };
vi.mock('@/lib/api/parishes.api', () => ({ parishesApi: api }));
vi.mock('@/lib/notify', () => ({ notify }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: me }) }));

const member = (over: Record<string, unknown> = {}) => ({
  userId: 'u2',
  firstName: 'Marie',
  lastName: 'Ngono',
  status: 'FAITHFUL',
  duties: [],
  joinedAt: '2026-10-01T10:00:00.000Z',
  ...over,
});
const page = (items: unknown[], total = items.length) => ({ items, total, page: 1, pageSize: 30 });

// Mobile (cartes) et bureau (tableau) sont tous deux dans le DOM de jsdom : on cible la liste mobile.
const card = (name: RegExp) =>
  within(screen.getByRole('list', { name: 'Membres' }))
    .getByText(name)
    .closest('li') as HTMLElement;

describe('ParishMembers', () => {
  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockReset());
    notify.success.mockReset();
    notify.error.mockReset();
    me = { id: 'u1', role: 'USER' };
    api.membership.mockResolvedValue({ status: 'PARISH_ADMIN', duties: [] });
  });

  it('refuse qui ne gère pas la paroisse, sans interroger la liste', async () => {
    api.membership.mockResolvedValue({ status: 'PARISHIONER', duties: ['PREPARER'] });
    render(<ParishMembers parishId="p1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('réservée aux administrateurs');
    expect(api.members).not.toHaveBeenCalled();
  });

  it('un fidèle ne voit pas non plus l’écran', async () => {
    api.membership.mockResolvedValue({ status: 'FAITHFUL', duties: [] });
    render(<ParishMembers parishId="p1" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(api.members).not.toHaveBeenCalled();
  });

  it('liste les membres : nom, date, statut — jamais d’email ni de téléphone', async () => {
    api.members.mockResolvedValue(
      page([member(), member({ userId: 'u3', firstName: 'Paul', status: 'PARISHIONER' })]),
    );
    render(<ParishMembers parishId="p1" />);
    expect(await screen.findByText('2 membres')).toBeInTheDocument();
    const marie = card(/Marie Ngono/);
    expect(within(marie).getByText(/1 octobre 2026/)).toBeInTheDocument();
    expect(within(marie).getByLabelText('Statut de Marie Ngono')).toHaveValue('FAITHFUL');
    expect(within(card(/Paul/)).getByLabelText('Statut de Paul Ngono')).toHaveValue('PARISHIONER');
    expect(document.body.textContent).not.toMatch(/@|\+237/);
  });

  it('un fidèle n’a pas de responsabilités à cocher, un paroissien oui', async () => {
    api.members.mockResolvedValue(
      page([member(), member({ userId: 'u3', firstName: 'Paul', status: 'PARISHIONER' })]),
    );
    render(<ParishMembers parishId="p1" />);
    await screen.findByText('2 membres');
    expect(within(card(/Marie/)).queryAllByRole('checkbox')).toHaveLength(0);
    expect(within(card(/Marie/)).getByText(/se donnent à un paroissien/)).toBeInTheDocument();
    expect(within(card(/Paul/)).getAllByRole('checkbox')).toHaveLength(3);
  });

  it('promeut un fidèle en paroissien (immédiat) et annonce le résultat', async () => {
    api.members.mockResolvedValue(page([member()]));
    api.updateMember.mockResolvedValue(member({ status: 'PARISHIONER' }));
    render(<ParishMembers parishId="p1" />);
    await screen.findByText('1 membre');
    await userEvent.selectOptions(
      within(card(/Marie/)).getByLabelText('Statut de Marie Ngono'),
      'PARISHIONER',
    );
    expect(api.updateMember).toHaveBeenCalledWith('p1', 'u2', { status: 'PARISHIONER' });
    await waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith('Marie Ngono est maintenant Paroissien.'),
    );
    // La carte montre aussitôt les responsabilités.
    expect(within(card(/Marie/)).getAllByRole('checkbox')).toHaveLength(3);
  });

  it('attribue puis retire une responsabilité en conservant les autres', async () => {
    api.members.mockResolvedValue(page([member({ status: 'PARISHIONER', duties: ['READER'] })]));
    api.updateMember
      .mockResolvedValueOnce(member({ status: 'PARISHIONER', duties: ['READER', 'PREPARER'] }))
      .mockResolvedValueOnce(member({ status: 'PARISHIONER', duties: ['PREPARER'] }));
    render(<ParishMembers parishId="p1" />);
    await screen.findByText('1 membre');
    const box = (label: string) => within(card(/Marie/)).getByLabelText(label);
    expect(box('Lecteur : Marie Ngono')).toBeChecked();

    await userEvent.click(box('Préparateur : Marie Ngono'));
    expect(api.updateMember).toHaveBeenLastCalledWith('p1', 'u2', {
      duties: ['READER', 'PREPARER'],
    });
    await waitFor(() => expect(box('Préparateur : Marie Ngono')).toBeChecked());
    expect(notify.success).toHaveBeenCalledWith('Responsabilités de Marie Ngono mises à jour.');

    await userEvent.click(box('Lecteur : Marie Ngono'));
    expect(api.updateMember).toHaveBeenLastCalledWith('p1', 'u2', { duties: ['PREPARER'] });
    await waitFor(() => expect(box('Lecteur : Marie Ngono')).not.toBeChecked());
  });

  it('refus de l’API (dernier administrateur) : toast d’erreur, la ligne ne change pas', async () => {
    me = { id: 'u2', role: 'USER' };
    api.members.mockResolvedValue(page([member({ status: 'PARISH_ADMIN' })]));
    api.updateMember.mockRejectedValue(
      Object.assign(new Error('Une paroisse doit garder au moins un administrateur'), {
        status: 409,
      }),
    );
    render(<ParishMembers parishId="p1" />);
    await screen.findByText('1 membre');
    expect(within(card(/Marie/)).getByText('(vous)')).toBeInTheDocument();
    await userEvent.selectOptions(
      within(card(/Marie/)).getByLabelText('Statut de Marie Ngono'),
      'FAITHFUL',
    );
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        'Impossible de modifier ce membre',
        expect.any(String),
      ),
    );
    expect(notify.success).not.toHaveBeenCalled();
    expect(within(card(/Marie/)).getByLabelText('Statut de Marie Ngono')).toHaveValue(
      'PARISH_ADMIN',
    );
  });

  it('retire un membre en deux temps, puis recharge la liste', async () => {
    api.members
      .mockResolvedValueOnce(page([member(), member({ userId: 'u3', firstName: 'Paul' })]))
      .mockResolvedValueOnce(page([member({ userId: 'u3', firstName: 'Paul' })]));
    api.removeMember.mockResolvedValue({ removed: true });
    render(<ParishMembers parishId="p1" />);
    await screen.findByText('2 membres');

    await userEvent.click(
      within(card(/Marie/)).getByRole('button', { name: 'Retirer Marie Ngono' }),
    );
    expect(api.removeMember).not.toHaveBeenCalled(); // premier clic : demande de confirmation
    await userEvent.click(within(card(/Marie/)).getByRole('button', { name: 'Annuler' }));
    expect(api.removeMember).not.toHaveBeenCalled();

    await userEvent.click(
      within(card(/Marie/)).getByRole('button', { name: 'Retirer Marie Ngono' }),
    );
    await userEvent.click(
      within(card(/Marie/)).getByRole('button', { name: 'Confirmer le retrait' }),
    );
    expect(api.removeMember).toHaveBeenCalledWith('p1', 'u2');
    await waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith('Marie Ngono a été retiré de la paroisse.'),
    );
    expect(await screen.findByText('1 membre')).toBeInTheDocument();
    expect(screen.queryByText(/Marie Ngono/)).not.toBeInTheDocument();
  });

  it('recherche avec un délai, filtre par statut, depuis la première page', async () => {
    api.members.mockResolvedValue(page([member()]));
    render(<ParishMembers parishId="p1" />);
    await screen.findByText('1 membre');
    await userEvent.type(screen.getByLabelText('Rechercher un membre'), 'ngo');
    await waitFor(() => expect(api.members).toHaveBeenLastCalledWith('p1', { q: 'ngo', page: 1 }));
    await userEvent.selectOptions(screen.getByLabelText('Filtrer par statut'), 'PARISH_ADMIN');
    await waitFor(() =>
      expect(api.members).toHaveBeenLastCalledWith('p1', {
        q: 'ngo',
        status: 'PARISH_ADMIN',
        page: 1,
      }),
    );
  });

  it('messages vides distincts : paroisse sans membre / recherche sans résultat', async () => {
    api.members.mockResolvedValue(page([]));
    const { unmount } = render(<ParishMembers parishId="p1" />);
    expect(
      await screen.findByText('Personne n’a encore rejoint cette paroisse.'),
    ).toBeInTheDocument();
    unmount();
    render(<ParishMembers parishId="p1" />);
    await screen.findByText('Personne n’a encore rejoint cette paroisse.');
    await userEvent.selectOptions(screen.getByLabelText('Filtrer par statut'), 'PARISHIONER');
    expect(await screen.findByText('Aucun membre ne correspond.')).toBeInTheDocument();
  });

  it('pagine quand il y a plus d’une page', async () => {
    api.members.mockResolvedValue({ items: [member()], total: 65, page: 1, pageSize: 30 });
    render(<ParishMembers parishId="p1" />);
    expect(await screen.findByText('Page 1 sur 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => expect(api.members).toHaveBeenLastCalledWith('p1', { q: '', page: 2 }));
  });

  it('en anglais', async () => {
    setTestLocale('en');
    api.members.mockResolvedValue(page([member({ status: 'PARISHIONER' })]));
    render(<ParishMembers parishId="p1" />);
    expect(await screen.findByText('1 member')).toBeInTheDocument();
    expect(screen.getByLabelText('Search for a member')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Status of Marie Ngono')[0]).toHaveValue('PARISHIONER');
    setTestLocale('fr');
  });

  it('erreur de chargement : toast, pas de liste', async () => {
    api.members.mockRejectedValue(new Error('boom'));
    render(<ParishMembers parishId="p1" />);
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith('Impossible de charger les membres', 'boom'),
    );
    expect(screen.queryByRole('list', { name: 'Membres' })).not.toBeInTheDocument();
  });
});
