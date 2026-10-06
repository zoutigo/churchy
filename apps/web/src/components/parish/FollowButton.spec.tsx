import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowButton } from './FollowButton';
import { setTestLocale } from '../../../vitest.setup';

const membership = vi.fn();
const follow = vi.fn();
const leave = vi.fn();
vi.mock('@/lib/api/parishes.api', () => ({
  parishesApi: {
    membership: (...a: unknown[]) => membership(...a),
    follow: (...a: unknown[]) => follow(...a),
    leave: (...a: unknown[]) => leave(...a),
  },
}));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/notify', () => ({ notify }));

let auth: { user: unknown; initializing: boolean };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

const user = { id: 'u1', firstName: 'Anne', lastName: 'Biya' };

describe('FollowButton', () => {
  beforeEach(() => {
    membership.mockReset();
    follow.mockReset();
    leave.mockReset();
    notify.success.mockReset();
    notify.error.mockReset();
    auth = { user, initializing: false };
    setTestLocale('fr');
  });

  it('visiteur : renvoie vers la connexion, puis revient sur la paroisse', () => {
    auth = { user: null, initializing: false };
    render(<FollowButton parishId="p1" parishName="Saint-Pierre" />);
    const link = screen.getByRole('link', { name: /Devenir fidèle/ });
    expect(link).toHaveAttribute('href', '/fr/connexion?next=%2Fparoisses%2Fp1');
    expect(membership).not.toHaveBeenCalled();
  });

  it('ne montre rien pendant la vérification de la session', () => {
    auth = { user: null, initializing: true };
    const { container } = render(<FollowButton parishId="p1" parishName="Saint-Pierre" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('connecté, ni fidèle ni membre : la boîte de dialogue annonce ce que verra l’administrateur', async () => {
    membership.mockResolvedValue({ status: null, duties: [] });
    follow.mockResolvedValue({ status: 'FAITHFUL', duties: [] });
    const u = userEvent.setup();
    render(<FollowButton parishId="p1" parishName="Saint-Pierre" />);
    await u.click(await screen.findByRole('button', { name: /Devenir fidèle/ }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Anne Biya');
    expect(screen.getByRole('dialog')).toHaveTextContent('ni votre email ni votre téléphone');
    expect(screen.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute(
      'href',
      '/fr/confidentialite',
    );
    expect(follow).not.toHaveBeenCalled();

    await u.click(screen.getByRole('button', { name: 'Confirmer' }));
    await waitFor(() => expect(follow).toHaveBeenCalledWith('p1'));
    expect(notify.success).toHaveBeenCalledWith('Vous êtes fidèle de Saint-Pierre');
    expect(await screen.findByText('Vous êtes fidèle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ne plus suivre' })).toBeInTheDocument();
  });

  it('annuler ne crée rien', async () => {
    membership.mockResolvedValue({ status: null, duties: [] });
    const u = userEvent.setup();
    render(<FollowButton parishId="p1" parishName="Saint-Pierre" />);
    await u.click(await screen.findByRole('button', { name: /Devenir fidèle/ }));
    await u.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(follow).not.toHaveBeenCalled();
  });

  it('signale l’échec par un toast', async () => {
    membership.mockResolvedValue({ status: null, duties: [] });
    follow.mockRejectedValue(new Error('Vous suivez déjà le nombre maximum de paroisses'));
    const u = userEvent.setup();
    render(<FollowButton parishId="p1" parishName="Saint-Pierre" />);
    await u.click(await screen.findByRole('button', { name: /Devenir fidèle/ }));
    await u.click(screen.getByRole('button', { name: 'Confirmer' }));
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        'Impossible de modifier votre appartenance à la paroisse',
        'Vous suivez déjà le nombre maximum de paroisses',
      ),
    );
  });

  it('un fidèle peut quitter la paroisse', async () => {
    membership.mockResolvedValue({ status: 'FAITHFUL', duties: [] });
    leave.mockResolvedValue({ membership: null });
    const u = userEvent.setup();
    render(<FollowButton parishId="p1" parishName="Saint-Pierre" />);
    await u.click(await screen.findByRole('button', { name: 'Ne plus suivre' }));
    await waitFor(() => expect(leave).toHaveBeenCalledWith('p1'));
    expect(notify.success).toHaveBeenCalledWith('Vous ne suivez plus Saint-Pierre');
    expect(await screen.findByRole('button', { name: /Devenir fidèle/ })).toBeInTheDocument();
  });

  it('un paroissien se retire en redevenant fidèle', async () => {
    membership.mockResolvedValue({ status: 'PARISHIONER', duties: ['READER'] });
    leave.mockResolvedValue({ membership: { status: 'FAITHFUL', duties: [] } });
    const u = userEvent.setup();
    render(<FollowButton parishId="p1" parishName="Saint-Pierre" />);
    expect(await screen.findByText('Vous êtes paroissien')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Me retirer (redevenir fidèle)' }));
    expect(await screen.findByText('Vous êtes fidèle')).toBeInTheDocument();
    expect(notify.success).toHaveBeenCalledWith('Vous êtes de nouveau fidèle de Saint-Pierre');
  });

  it('un administrateur ne se retire pas d’ici', async () => {
    membership.mockResolvedValue({ status: 'PARISH_ADMIN', duties: [] });
    render(<FollowButton parishId="p1" parishName="Saint-Pierre" />);
    expect(await screen.findByText('Vous administrez cette paroisse')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('en anglais', async () => {
    setTestLocale('en');
    membership.mockResolvedValue({ status: 'FAITHFUL', duties: [] });
    render(<FollowButton parishId="p1" parishName="Saint Peter" />);
    expect(await screen.findByText('You are a follower')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unfollow' })).toBeInTheDocument();
  });
});
