import { api } from './client';
import type {
  Parish,
  CreateParishDto,
  ParishDuty,
  ParishMemberDto,
  ParishMembersPageDto,
  ParishMembershipDto,
  ParishStatus,
  UpdateMemberDto,
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
  /** Membres (administrateur) : recherche par nom, filtre de statut, page. */
  members: (id: string, params: { q?: string; status?: ParishStatus; page?: number }) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.status) search.set('status', params.status);
    if (params.page && params.page > 1) search.set('page', String(params.page));
    const qs = search.toString();
    return api.get<ParishMembersPageDto>(`/parishes/${id}/members${qs ? `?${qs}` : ''}`);
  },
  updateMember: (id: string, userId: string, dto: UpdateMemberDto) =>
    api.patch<ParishMemberDto>(`/parishes/${id}/members/${encodeURIComponent(userId)}`, dto),
  removeMember: (id: string, userId: string) =>
    api.delete<{ removed: true }>(`/parishes/${id}/members/${encodeURIComponent(userId)}`),
};
