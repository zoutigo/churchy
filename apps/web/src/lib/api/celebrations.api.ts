import { api } from './client';
import type { Celebration, CreateCelebrationDto } from '@churchy/shared';

export const celebrationsApi = {
  create: (parishId: string, dto: CreateCelebrationDto) =>
    api.post<Celebration>(`/parishes/${parishId}/celebrations`, dto),
  findByParish: (parishId: string) => api.get<Celebration[]>(`/parishes/${parishId}/celebrations`),
  /** Célébrations publiées d'une paroisse, sans authentification (pages publiques). */
  findPublishedByParishSlug: (slug: string) =>
    api.get<Celebration[]>(`/public/parishes/${slug}/celebrations`),
  findById: (id: string) => api.get<Celebration>(`/celebrations/${id}`),
  publish: (id: string) => api.post<Celebration>(`/celebrations/${id}/publish`, {}),
  archive: (id: string) => api.post<Celebration>(`/celebrations/${id}/archive`, {}),
};
