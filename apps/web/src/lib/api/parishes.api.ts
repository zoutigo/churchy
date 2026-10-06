import { api } from './client';
import type {
  Parish,
  CreateParishDto,
  ParishDuty,
  ParishMembershipDto,
  ParishStatus,
  UpdateParishDto,
} from '@churchy/shared';

export const parishesApi = {
  create: (dto: CreateParishDto) => api.post<Parish>('/parishes', dto),
  update: (id: string, dto: UpdateParishDto) => api.patch<Parish>(`/parishes/${id}`, dto),
  findMine: () =>
    api.get<(Parish & { status: ParishStatus; duties: ParishDuty[] })[]>('/parishes/my'),
  findById: (id: string) => api.get<Parish>(`/parishes/${id}`),
  /** Appartenance de la personne connectée (`status` vide : ni fidèle ni membre). */
  membership: (id: string) => api.get<ParishMembershipDto>(`/parishes/${id}/membership`),
  /** Devenir fidèle (sans validation, idempotent). */
  follow: (id: string) => api.post<ParishMembershipDto>(`/parishes/${id}/follow`),
  /** Se retirer d'un cran : paroissien → fidèle, fidèle → quitte la paroisse (`membership: null`). */
  leave: (id: string) =>
    api.delete<{ membership: ParishMembershipDto | null }>(`/parishes/${id}/follow`),
};
