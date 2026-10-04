import type { MergeFavoritesDto, PublicParishSummary } from '@churchy/shared';
import { api } from './client';

export const favoritesApi = {
  /** Compte connecté : favoris persistés, dans l'ordre d'ajout. */
  list: () => api.get<PublicParishSummary[]>('/favorites'),
  add: (parishId: string) => api.put<void>(`/favorites/${encodeURIComponent(parishId)}`),
  remove: (parishId: string) => api.delete<void>(`/favorites/${encodeURIComponent(parishId)}`),
  /** Verse les favoris de l'appareil dans le compte (à la connexion). */
  merge: (dto: MergeFavoritesDto) => api.post<PublicParishSummary[]>('/favorites/merge', dto),
  /** Visiteur : résumés des paroisses dont l'appareil a gardé l'identifiant. */
  summaries: (ids: string[]) =>
    ids.length === 0
      ? Promise.resolve([] as PublicParishSummary[])
      : api.get<PublicParishSummary[]>(
          `/public/parishes/summaries?ids=${ids.map(encodeURIComponent).join(',')}`,
        ),
};
