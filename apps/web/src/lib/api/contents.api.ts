import { api } from './client';
import type { Content, CreateContentDto, UpdateContentDto } from '@churchy/shared';

export const contentsApi = {
  create: (parishId: string, dto: CreateContentDto) =>
    api.post<Content>(`/parishes/${parishId}/contents`, dto),
  findByParish: (parishId: string) => api.get<Content[]>(`/parishes/${parishId}/contents`),
  findById: (id: string) => api.get<Content>(`/contents/${id}`),
  update: (id: string, dto: UpdateContentDto) => api.patch<Content>(`/contents/${id}`, dto),
  delete: (id: string) => api.delete<void>(`/contents/${id}`),
};
