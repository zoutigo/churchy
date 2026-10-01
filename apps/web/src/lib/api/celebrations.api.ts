import { api } from './client';
import type { Celebration, CreateCelebrationDto } from '@churchy/shared';

export const celebrationsApi = {
  create: (parishId: string, dto: CreateCelebrationDto) =>
    api.post<Celebration>(`/parishes/${parishId}/celebrations`, dto),
  findByParish: (parishId: string) => api.get<Celebration[]>(`/parishes/${parishId}/celebrations`),
  findById: (id: string) => api.get<Celebration>(`/celebrations/${id}`),
  setAnnounced: (id: string, announced: boolean) =>
    api.patch<Celebration>(`/celebrations/${id}/announced`, { announced }),
  publish: (id: string) => api.post<Celebration>(`/celebrations/${id}/publish`, {}),
  archive: (id: string) => api.post<Celebration>(`/celebrations/${id}/archive`, {}),
};
