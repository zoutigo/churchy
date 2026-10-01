import { api } from './client';
import type { Parish, CreateParishDto, UpdateParishDto } from '@churchy/shared';

export const parishesApi = {
  create: (dto: CreateParishDto) => api.post<Parish>('/parishes', dto),
  update: (id: string, dto: UpdateParishDto) => api.patch<Parish>(`/parishes/${id}`, dto),
  findMine: () => api.get<(Parish & { role: string })[]>('/parishes/my'),
  findById: (id: string) => api.get<Parish>(`/parishes/${id}`),
};
