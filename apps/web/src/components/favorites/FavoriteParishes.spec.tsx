import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PublicParishSummary } from '@churchy/shared';
import { DashboardFavorites, FavoritesPage, FavoritesShelf } from './FavoriteParishes';

const parish = (id: string, name: string): PublicParishSummary => ({
  id,
  name,
  city: 'Lyon',
  country: 'France',
  district: null,
  mainChurch: null,
  nextCelebration: null,
});

let state: {
  ids: string[];
  items: PublicParishSummary[];
  ready: boolean;
  itemsLoading: boolean;
};
vi.mock('./FavoritesProvider', () => ({
  useFavoriteItems: () => state,
  useFavorites: () => ({ ...state, isFavorite: () => true, toggle: vi.fn() }),
}));

describe('FavoritesShelf (landing)', () => {
  beforeEach(() => {
    state = { ids: [], items: [], ready: true, itemsLoading: false };
  });

  it('n’affiche rien sans favori', () => {
    const { container } = render(<FavoritesShelf />);
    expect(container).toBeEmptyDOMElement();
  });

  it('n’affiche rien tant que les favoris ne sont pas connus', () => {
    state = { ids: ['a'], items: [], ready: false, itemsLoading: false };
    const { container } = render(<FavoritesShelf />);
    expect(container).toBeEmptyDOMElement();
  });

  it('un seul favori : « Ma paroisse », avec un lien vers la paroisse', () => {
    state = { ids: ['a'], items: [parish('a', 'Saint-Pierre')], ready: true, itemsLoading: false };
    render(<FavoritesShelf />);
    expect(screen.getByRole('heading', { name: 'Ma paroisse' })).toBeInTheDocument();
    const view = screen.getByRole('link', { name: 'Voir la paroisse Saint-Pierre' });
    expect(view).toHaveAttribute('href', '/fr/paroisses/a');
    expect(view).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Mes favoris' })).toHaveAttribute(
      'href',
      '/fr/favoris',
    );
  });

  it('plusieurs favoris : « Mes paroisses favorites », une carte chacun', () => {
    state = {
      ids: ['a', 'b'],
      items: [parish('a', 'Saint-Pierre'), parish('b', 'Sainte-Anne')],
      ready: true,
      itemsLoading: false,
    };
    render(<FavoritesShelf />);
    expect(screen.getByRole('heading', { name: 'Mes paroisses favorites' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('pendant le chargement, affiche un squelette plutôt que des cartes vides', () => {
    state = { ids: ['a', 'b'], items: [], ready: true, itemsLoading: true };
    render(<FavoritesShelf />);
    expect(screen.getByLabelText('Chargement des favoris')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
});

describe('FavoritesPage', () => {
  it('sans favori : invite à trouver une paroisse', () => {
    state = { ids: [], items: [], ready: true, itemsLoading: false };
    render(<FavoritesPage />);
    expect(screen.getByRole('heading', { name: 'Mes favoris' })).toBeInTheDocument();
    expect(screen.getByText('Aucune paroisse en favori pour l’instant')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trouver une paroisse' })).toHaveAttribute(
      'href',
      '/fr/paroisses',
    );
  });

  it('avec des favoris : liste les paroisses et le compteur sur 10', () => {
    state = { ids: ['a'], items: [parish('a', 'Saint-Pierre')], ready: true, itemsLoading: false };
    render(<FavoritesPage />);
    expect(screen.getByText('1 sur 10.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Saint-Pierre' })).toBeInTheDocument();
  });
});

describe('DashboardFavorites (tableau de bord)', () => {
  it('sans favori : invite à trouver une paroisse', () => {
    state = { ids: [], items: [], ready: true, itemsLoading: false };
    render(<DashboardFavorites />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mes favoris' })).toBeInTheDocument();
    expect(screen.getByText('Aucune paroisse en favori pour l’instant')).toBeInTheDocument();
    const find = screen.getByRole('link', { name: 'Trouver une paroisse' });
    expect(find).toHaveAttribute('href', '/fr/paroisses');
    expect(find).toHaveAttribute('target', '_blank');
  });

  it('n’affiche rien d’autre que le titre tant que les favoris ne sont pas connus', () => {
    state = { ids: ['a'], items: [], ready: false, itemsLoading: false };
    render(<DashboardFavorites />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mes favoris' })).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('liste les paroisses favorites avec le compteur', () => {
    state = {
      ids: ['a', 'b'],
      items: [parish('a', 'Saint-Pierre'), parish('b', 'Sainte-Anne')],
      ready: true,
      itemsLoading: false,
    };
    render(<DashboardFavorites />);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText(/2 sur 10/)).toBeInTheDocument();
    // Le site public s'ouvre dans un nouvel onglet : on ne quitte pas le tableau de bord.
    const view = screen.getByRole('link', { name: /Voir la paroisse Saint-Pierre/ });
    expect(view).toHaveAttribute('href', '/fr/paroisses/a');
    expect(view).toHaveAttribute('target', '_blank');
    expect(view).toHaveAttribute('rel', 'noopener noreferrer');
    expect(view).toHaveAccessibleName(/nouvel onglet/);
  });

  it('pendant le chargement, affiche un squelette', () => {
    state = { ids: ['a'], items: [], ready: true, itemsLoading: true };
    render(<DashboardFavorites />);
    expect(screen.getByLabelText('Chargement des favoris')).toHaveAttribute('aria-busy', 'true');
  });
});
