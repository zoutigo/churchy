import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PublicParishSummary } from '@churchy/shared';
import { FavoritesPage, FavoritesShelf } from './FavoriteParishes';

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
    expect(screen.getByRole('link', { name: 'Voir la paroisse Saint-Pierre' })).toHaveAttribute(
      'href',
      '/paroisses/a',
    );
    expect(screen.getByRole('link', { name: 'Mes favoris' })).toHaveAttribute('href', '/favoris');
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
      '/paroisses',
    );
  });

  it('avec des favoris : liste les paroisses et le compteur sur 10', () => {
    state = { ids: ['a'], items: [parish('a', 'Saint-Pierre')], ready: true, itemsLoading: false };
    render(<FavoritesPage />);
    expect(screen.getByText('1 sur 10.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Saint-Pierre' })).toBeInTheDocument();
  });
});
