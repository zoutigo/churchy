import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MAX_FAVORITE_PARISHES, type PublicParishSummary } from '@churchy/shared';
import { ApiError } from '@/lib/api/client';
import { FAVORITES_KEY, readLocalFavorites } from '@/lib/favorites/storage';
import { FavoritesProvider, useFavoriteItems, useFavorites } from './FavoritesProvider';

let auth: { user: { id: string } | null; initializing: boolean };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

const api = vi.hoisted(() => ({
  list: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  merge: vi.fn(),
  summaries: vi.fn(),
}));
vi.mock('@/lib/api/favorites.api', () => ({ favoritesApi: api }));

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/notify', () => ({ notify }));

const summary = (id: string): PublicParishSummary => ({
  id,
  name: `Paroisse ${id}`,
  city: 'Lyon',
  country: 'France',
  district: null,
  mainChurch: null,
  nextCelebration: null,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FavoritesProvider>{children}</FavoritesProvider>
);

describe('FavoritesProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth = { user: null, initializing: false };
    api.summaries.mockImplementation(async (ids: string[]) => ids.map(summary));
  });

  describe('visiteur (appareil)', () => {
    it('relit les favoris du localStorage sans appeler l’API', async () => {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(['a', 'b']));
      const { result } = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.ids).toEqual(['a', 'b']);
      expect(result.current.isFavorite('a')).toBe(true);
      expect(api.list).not.toHaveBeenCalled();
      expect(api.summaries).not.toHaveBeenCalled();
    });

    it('ajoute puis retire une paroisse, avec un toast et en conservant le localStorage', async () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));

      await act(() => result.current.toggle({ id: 'a', name: 'Saint-Pierre' }));
      expect(result.current.ids).toEqual(['a']);
      expect(readLocalFavorites()).toEqual(['a']);
      expect(notify.success).toHaveBeenCalledWith('Ajoutée à vos favoris', expect.any(String));

      await act(() => result.current.toggle({ id: 'a', name: 'Saint-Pierre' }));
      expect(result.current.ids).toEqual([]);
      expect(readLocalFavorites()).toEqual([]);
      expect(notify.success).toHaveBeenLastCalledWith('Favori retiré', expect.any(String));
      expect(api.add).not.toHaveBeenCalled();
    });

    it(`refuse un favori au-delà de ${MAX_FAVORITE_PARISHES} avec un toast d’erreur`, async () => {
      const full = Array.from({ length: MAX_FAVORITE_PARISHES }, (_, i) => `p${i}`);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(full));
      const { result } = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));

      await act(() => result.current.toggle({ id: 'extra', name: 'Une de plus' }));

      expect(result.current.ids).toEqual(full);
      expect(notify.error).toHaveBeenCalledWith('Limite de favoris atteinte', expect.any(String));
    });

    it('ne charge les résumés que si un composant les demande, et ignore une paroisse disparue', async () => {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(['a', 'gone']));
      api.summaries.mockResolvedValue([summary('a')]);
      const { result } = renderHook(() => useFavoriteItems(), { wrapper });
      await waitFor(() => expect(result.current.items.map((p) => p.id)).toEqual(['a']));
      expect(api.summaries).toHaveBeenCalledWith(['a', 'gone']);
      expect(result.current.ids).toEqual(['a']);
      expect(readLocalFavorites()).toEqual(['a']);
    });

    it('conserve les favoris quand les résumés ne peuvent pas être chargés (hors ligne)', async () => {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(['a']));
      api.summaries.mockRejectedValue(new ApiError('hors ligne', 0));
      const { result } = renderHook(() => useFavoriteItems(), { wrapper });
      await waitFor(() => expect(api.summaries).toHaveBeenCalled());
      await waitFor(() => expect(result.current.itemsLoading).toBe(false));
      expect(result.current.ids).toEqual(['a']);
      expect(readLocalFavorites()).toEqual(['a']);
    });

    it('attend la fin de la vérification de session avant de se déclarer prêt', () => {
      auth = { user: null, initializing: true };
      const { result } = renderHook(() => useFavorites(), { wrapper });
      expect(result.current.ready).toBe(false);
    });
  });

  describe('connecté (base de données)', () => {
    beforeEach(() => {
      auth = { user: { id: 'u1' }, initializing: false };
    });

    it('charge les favoris du compte', async () => {
      api.list.mockResolvedValue([summary('a'), summary('b')]);
      const { result } = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.ids).toEqual(['a', 'b']);
      expect(result.current.items).toHaveLength(2);
      expect(api.merge).not.toHaveBeenCalled();
    });

    it('verse les favoris de l’appareil dans le compte, puis vide l’appareil', async () => {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(['x', 'y']));
      api.merge.mockResolvedValue([summary('x'), summary('y'), summary('z')]);
      const { result } = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(api.merge).toHaveBeenCalledWith({ parishIds: ['x', 'y'] });
      expect(result.current.ids).toEqual(['x', 'y', 'z']);
      expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
    });

    it('si la fusion échoue, garde les favoris de l’appareil et affiche ceux du compte', async () => {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(['x']));
      api.merge.mockRejectedValue(new ApiError('boom', 500));
      api.list.mockResolvedValue([summary('z')]);
      const { result } = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.ids).toEqual(['z']);
      expect(readLocalFavorites()).toEqual(['x']);
    });

    it('ajoute via l’API (sans toucher au localStorage) et annonce le succès', async () => {
      api.list.mockResolvedValue([]);
      api.add.mockResolvedValue(undefined);
      const { result } = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));

      await act(() => result.current.toggle({ id: 'a', name: 'Saint-Pierre' }));

      expect(api.add).toHaveBeenCalledWith('a');
      expect(result.current.ids).toEqual(['a']);
      expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
      expect(notify.success).toHaveBeenCalled();
    });

    it('retire via l’API', async () => {
      api.list.mockResolvedValue([summary('a')]);
      api.remove.mockResolvedValue(undefined);
      const { result } = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));
      await act(() => result.current.toggle({ id: 'a', name: 'Saint-Pierre' }));
      expect(api.remove).toHaveBeenCalledWith('a');
      expect(result.current.ids).toEqual([]);
    });

    it('annule la modification et affiche l’erreur de l’API quand l’ajout échoue', async () => {
      api.list.mockResolvedValue([]);
      api.add.mockRejectedValue(new ApiError('10 paroisses favorites au maximum', 409));
      const { result } = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));

      await act(() => result.current.toggle({ id: 'a', name: 'Saint-Pierre' }));

      expect(result.current.ids).toEqual([]);
      expect(notify.error).toHaveBeenCalledWith(
        'Impossible d’ajouter ce favori',
        '10 paroisses favorites au maximum',
      );
      expect(notify.success).not.toHaveBeenCalled();
    });

    it('à la déconnexion, ne garde rien du compte sur l’appareil', async () => {
      api.list.mockResolvedValue([summary('a')]);
      const view = renderHook(() => useFavorites(), { wrapper });
      await waitFor(() => expect(view.result.current.ids).toEqual(['a']));

      auth = { user: null, initializing: false };
      view.rerender();

      await waitFor(() => expect(view.result.current.ids).toEqual([]));
      expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
    });
  });

  it('useFavorites hors provider lève une erreur explicite', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Probe = () => {
      useFavorites();
      return null;
    };
    expect(() => render(<Probe />)).toThrow(/FavoritesProvider/);
    spy.mockRestore();
    expect(screen).toBeDefined();
  });
});
