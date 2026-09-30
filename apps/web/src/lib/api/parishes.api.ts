import { api } from './client';
import type { Parish, CreateParishDto } from '@churchy/shared';

export const parishesApi = {
  create: (dto: CreateParishDto) => api.post<Parish>('/parishes', dto),
  findMine: () => api.get<(Parish & { role: string })[]>('/parishes/my'),
  findById: (id: string) => api.get<Parish>(`/parishes/${id}`),
  findBySlug: (slug: string) => api.get<Parish>(`/parishes/slug/${slug}`),
  findPublic: (q?: string) =>
    api.get<Parish[]>(`/public/parishes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
};
