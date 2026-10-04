import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from './AuthGuard';

const replace = vi.fn();
let auth: {
  user: object | null;
  initializing: boolean;
  sessionExpired: boolean;
  loggedOut: boolean;
};
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/dashboard/parishes',
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

describe('AuthGuard', () => {
  beforeEach(() => {
    replace.mockReset();
    auth = { user: null, initializing: false, sessionExpired: false, loggedOut: false };
  });

  it('n’affiche rien de privé pendant la vérification de la session', () => {
    auth = { user: null, initializing: true, sessionExpired: false, loggedOut: false };
    render(
      <AuthGuard>
        <p>contenu privé</p>
      </AuthGuard>,
    );
    expect(screen.queryByText('contenu privé')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Chargement' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('affiche le contenu pour un utilisateur connecté', () => {
    auth = { user: { id: 'u1' }, initializing: false, sessionExpired: false, loggedOut: false };
    render(
      <AuthGuard>
        <p>contenu privé</p>
      </AuthGuard>,
    );
    expect(screen.getByText('contenu privé')).toBeInTheDocument();
  });

  it('redirige un anonyme vers la connexion en mémorisant la page demandée', () => {
    render(
      <AuthGuard>
        <p>contenu privé</p>
      </AuthGuard>,
    );
    expect(screen.queryByText('contenu privé')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/fr/connexion?next=%2Fdashboard%2Fparishes');
  });

  it('ajoute expired=1 quand la session a été perdue en cours de navigation', () => {
    auth = { user: null, initializing: false, sessionExpired: true, loggedOut: false };
    render(
      <AuthGuard>
        <p>contenu privé</p>
      </AuthGuard>,
    );
    expect(replace).toHaveBeenCalledWith('/fr/connexion?expired=1&next=%2Fdashboard%2Fparishes');
  });

  it('après une déconnexion volontaire, retourne à /login sans page de retour', () => {
    auth = { user: null, initializing: false, sessionExpired: false, loggedOut: true };
    render(
      <AuthGuard>
        <p>contenu privé</p>
      </AuthGuard>,
    );
    expect(replace).toHaveBeenCalledWith('/fr/connexion');
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
