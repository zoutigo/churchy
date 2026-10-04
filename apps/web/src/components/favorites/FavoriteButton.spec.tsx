import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteButton } from './FavoriteButton';

const toggle = vi.fn();
let state: { isFavorite: (id: string) => boolean; ready: boolean };
vi.mock('./FavoritesProvider', () => ({ useFavorites: () => ({ ...state, toggle }) }));

describe('FavoriteButton', () => {
  beforeEach(() => {
    toggle.mockReset();
    state = { isFavorite: () => false, ready: true };
  });

  it('version complète : libellé « Ajouter aux favoris », état non pressé', async () => {
    render(<FavoriteButton parishId="p1" parishName="Saint-Pierre" />);
    const button = screen.getByRole('button', { name: 'Ajouter aux favoris' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(toggle).toHaveBeenCalledWith({ id: 'p1', name: 'Saint-Pierre' });
  });

  it('paroisse déjà en favori : état pressé et libellé « Dans mes favoris »', () => {
    state = { isFavorite: (id) => id === 'p1', ready: true };
    render(<FavoriteButton parishId="p1" parishName="Saint-Pierre" />);
    expect(screen.getByRole('button', { name: 'Dans mes favoris' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('version icône : le nom de la paroisse figure dans le libellé accessible', () => {
    state = { isFavorite: () => true, ready: true };
    render(<FavoriteButton parishId="p1" parishName="Saint-Pierre" variant="icon" />);
    expect(
      screen.getByRole('button', { name: 'Retirer des favoris : Saint-Pierre' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('désactivé tant que les favoris ne sont pas connus (évite un faux état)', () => {
    state = { isFavorite: () => true, ready: false };
    render(<FavoriteButton parishId="p1" parishName="Saint-Pierre" />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
