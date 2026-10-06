import type { PlatformUserDto, PlatformUsersPageDto, UserRole } from '@churchy/shared';
import { api } from './client';

export const platformApi = {
  users: (params: { q?: string; page?: number }) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.page && params.page > 1) search.set('page', String(params.page));
    const qs = search.toString();
    return api.get<PlatformUsersPageDto>(`/platform/users${qs ? `?${qs}` : ''}`);
  },
  changeRole: (id: string, role: UserRole) =>
    api.patch<PlatformUserDto>(`/platform/users/${encodeURIComponent(id)}/role`, { role }),
  suspend: (id: string) =>
    api.post<PlatformUserDto>(`/platform/users/${encodeURIComponent(id)}/suspend`),
  reinstate: (id: string) =>
    api.post<PlatformUserDto>(`/platform/users/${encodeURIComponent(id)}/reinstate`),
};
