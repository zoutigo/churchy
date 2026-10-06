import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { PlatformUsers } from './PlatformUsers';

const api = vi.hoisted(() => ({
  users: vi.fn(),
  changeRole: vi.fn(),
  suspend: vi.fn(),
  reinstate: vi.fn(),
}));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
let me: { id: string; role: string } | null;
vi.mock('@/lib/api/platform.api', () => ({ platformApi: api }));
vi.mock('@/lib/notify', () => ({ notify }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: me }) }));

const row = (over: Record<string, unknown> = {}) => ({
  id: 'u2',
  email: 'marie@test.fr',
  firstName: 'Marie',
  lastName: 'Ngono',
  role: 'USER',
  suspendedAt: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  ...over,
});
const page = (items: unknown[], total = items.length) => ({
  items,
  total,
  page: 1,
  pageSize: 20,
});

// Mobile (cartes) et bureau (tableau) sont tous deux dans le DOM de jsdom : on cible la liste mobile.
const card = (name: RegExp) =>
  within(screen.getByRole('list', { name: 'Comptes' }))
    .getByText(name)
    .closest('li') as HTMLElement;

describe('PlatformUsers', () => {
  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockReset());
    notify.success.mockReset();
    notify.error.mockReset();
    me = { id: 'u1', role: 'ADMIN' };
  });

  it('refuse un modérateur (pas de permission sur les comptes) sans interroger l’API', () => {
    me = { id: 'u1', role: 'MODERATOR' };
    render(<PlatformUsers />);
    expect(screen.getByRole('alert')).toHaveTextContent('réservé aux équipes de la plateforme');
    expect(api.users).not.toHaveBeenCalled();
  });

  it('liste les comptes avec leur nombre, leur email et leur état', async () => {
    api.users.mockResolvedValue(
      page([row(), row({ id: 'u3', firstName: 'Paul', suspendedAt: '2026-10-05T10:00:00.000Z' })]),
    );
    render(<PlatformUsers />);
    expect(await screen.findByText('2 comptes')).toBeInTheDocument();
    expect(within(card(/Marie/)).getByText('marie@test.fr')).toBeInTheDocument();
    expect(within(card(/Paul/)).getByText('Suspendu')).toBeInTheDocument();
    expect(within(card(/Marie/)).getByText('Actif')).toBeInTheDocument();
  });

  it('recherche avec un délai, depuis la première page', async () => {
    api.users.mockResolvedValue(page([row()]));
    render(<PlatformUsers />);
    await screen.findByText('1 compte');
    await userEvent.type(screen.getByLabelText('Rechercher un compte'), 'ngo');
    await waitFor(() => expect(api.users).toHaveBeenLastCalledWith({ q: 'ngo', page: 1 }));
  });

  it('aucun résultat : message vide', async () => {
    api.users.mockResolvedValue(page([]));
    render(<PlatformUsers />);
    expect(await screen.findByText('Aucun compte ne correspond.')).toBeInTheDocument();
  });

  it('échec du chargement : toast d’erreur', async () => {
    api.users.mockRejectedValue(new Error('boom'));
    render(<PlatformUsers />);
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith('Impossible de charger les comptes', 'boom'),
    );
  });

  it('pagine quand il y a plus d’une page', async () => {
    api.users.mockResolvedValue(page([row()], 45));
    render(<PlatformUsers />);
    expect(await screen.findByText('Page 1 sur 3')).toBeInTheDocument();
    api.users.mockResolvedValue({ ...page([row()], 45), page: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => expect(api.users).toHaveBeenLastCalledWith({ q: '', page: 2 }));
    expect(await screen.findByText('Page 2 sur 3')).toBeInTheDocument();
  });

  describe('rôles', () => {
    it('l’ADMIN ne peut proposer que Modérateur et Utilisateur', async () => {
      api.users.mockResolvedValue(page([row()]));
      render(<PlatformUsers />);
      await screen.findByText('1 compte');
      const select = within(card(/Marie/)).getByLabelText('Rôle de Marie Ngono');
      const labels = within(select)
        .getAllByRole('option')
        .map((o) => o.textContent);
      expect(labels).toEqual(['Modérateur', 'Utilisateur']);
    });

    it('le SUPER_ADMIN peut tout proposer', async () => {
      me = { id: 'u1', role: 'SUPER_ADMIN' };
      api.users.mockResolvedValue(page([row()]));
      render(<PlatformUsers />);
      await screen.findByText('1 compte');
      const select = within(card(/Marie/)).getByLabelText('Rôle de Marie Ngono');
      expect(within(select).getAllByRole('option')).toHaveLength(4);
    });

    it('un ADMIN et un SUPER_ADMIN ne sont pas modifiables par un ADMIN (texte seul, pas de liste)', async () => {
      api.users.mockResolvedValue(
        page([
          row({ id: 'a2', firstName: 'Alice', role: 'ADMIN' }),
          row({ id: 's', firstName: 'Sam', role: 'SUPER_ADMIN' }),
        ]),
      );
      render(<PlatformUsers />);
      await screen.findByText('2 comptes');
      expect(within(card(/Alice/)).queryByRole('combobox')).not.toBeInTheDocument();
      expect(within(card(/Alice/)).getByText('Administrateur')).toBeInTheDocument();
      expect(within(card(/Sam/)).queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('change un rôle : ligne mise à jour et toast de succès', async () => {
      api.users.mockResolvedValue(page([row()]));
      api.changeRole.mockResolvedValue(row({ role: 'MODERATOR' }));
      render(<PlatformUsers />);
      await screen.findByText('1 compte');
      await userEvent.selectOptions(
        within(card(/Marie/)).getByLabelText('Rôle de Marie Ngono'),
        'MODERATOR',
      );
      await waitFor(() => expect(api.changeRole).toHaveBeenCalledWith('u2', 'MODERATOR'));
      expect(notify.success).toHaveBeenCalledWith(
        'Rôle modifié : Marie Ngono est maintenant Modérateur.',
      );
      expect(within(card(/Marie/)).getByLabelText('Rôle de Marie Ngono')).toHaveValue('MODERATOR');
    });

    it('échec : toast d’erreur et rôle inchangé', async () => {
      api.users.mockResolvedValue(page([row()]));
      api.changeRole.mockRejectedValue(new Error('Vous n’avez pas le droit'));
      render(<PlatformUsers />);
      await screen.findByText('1 compte');
      await userEvent.selectOptions(
        within(card(/Marie/)).getByLabelText('Rôle de Marie Ngono'),
        'MODERATOR',
      );
      await waitFor(() =>
        expect(notify.error).toHaveBeenCalledWith(
          'Impossible de modifier le rôle',
          'Vous n’avez pas le droit',
        ),
      );
      expect(within(card(/Marie/)).getByLabelText('Rôle de Marie Ngono')).toHaveValue('USER');
    });
  });

  describe('suspension', () => {
    it('demande une confirmation, suspend, puis annonce le succès', async () => {
      api.users.mockResolvedValue(page([row()]));
      api.suspend.mockResolvedValue(row({ suspendedAt: '2026-10-06T10:00:00.000Z' }));
      render(<PlatformUsers />);
      await screen.findByText('1 compte');
      await userEvent.click(within(card(/Marie/)).getByRole('button', { name: 'Suspendre' }));
      expect(api.suspend).not.toHaveBeenCalled();
      await userEvent.click(
        within(card(/Marie/)).getByRole('button', { name: 'Confirmer la suspension' }),
      );
      await waitFor(() => expect(api.suspend).toHaveBeenCalledWith('u2'));
      expect(notify.success).toHaveBeenCalledWith('Marie Ngono est suspendu.');
      expect(within(card(/Marie/)).getByText('Suspendu')).toBeInTheDocument();
      expect(within(card(/Marie/)).getByRole('button', { name: 'Rétablir' })).toBeInTheDocument();
    });

    it('annuler la confirmation ne suspend rien', async () => {
      api.users.mockResolvedValue(page([row()]));
      render(<PlatformUsers />);
      await screen.findByText('1 compte');
      await userEvent.click(within(card(/Marie/)).getByRole('button', { name: 'Suspendre' }));
      await userEvent.click(within(card(/Marie/)).getByRole('button', { name: 'Annuler' }));
      expect(api.suspend).not.toHaveBeenCalled();
      expect(within(card(/Marie/)).getByRole('button', { name: 'Suspendre' })).toBeInTheDocument();
    });

    it('rétablit un compte suspendu', async () => {
      api.users.mockResolvedValue(page([row({ suspendedAt: '2026-10-05T10:00:00.000Z' })]));
      api.reinstate.mockResolvedValue(row());
      render(<PlatformUsers />);
      await screen.findByText('1 compte');
      await userEvent.click(within(card(/Marie/)).getByRole('button', { name: 'Rétablir' }));
      await waitFor(() => expect(api.reinstate).toHaveBeenCalledWith('u2'));
      expect(notify.success).toHaveBeenCalledWith('Marie Ngono est rétabli.');
    });

    it('échec : toast d’erreur', async () => {
      api.users.mockResolvedValue(page([row()]));
      api.suspend.mockRejectedValue(new Error('refusé'));
      render(<PlatformUsers />);
      await screen.findByText('1 compte');
      await userEvent.click(within(card(/Marie/)).getByRole('button', { name: 'Suspendre' }));
      await userEvent.click(
        within(card(/Marie/)).getByRole('button', { name: 'Confirmer la suspension' }),
      );
      await waitFor(() =>
        expect(notify.error).toHaveBeenCalledWith('Impossible de modifier la suspension', 'refusé'),
      );
    });

    it('pas de bouton pour soi-même, ni pour un ADMIN quand on est ADMIN', async () => {
      api.users.mockResolvedValue(
        page([
          row({ id: 'u1', firstName: 'Moi', role: 'ADMIN' }),
          row({ id: 'a2', firstName: 'Alice', role: 'ADMIN' }),
        ]),
      );
      render(<PlatformUsers />);
      await screen.findByText('2 comptes');
      expect(within(card(/Moi/)).queryByRole('button')).not.toBeInTheDocument();
      expect(within(card(/Moi/)).getByText(/vous/)).toBeInTheDocument();
      expect(within(card(/Alice/)).queryByRole('button')).not.toBeInTheDocument();
    });
  });

  it('en anglais', async () => {
    setTestLocale('en');
    api.users.mockResolvedValue(page([row()]));
    render(<PlatformUsers />);
    expect(await screen.findByText('1 account')).toBeInTheDocument();
    expect(screen.getByLabelText('Search for an account')).toBeInTheDocument();
  });
});
