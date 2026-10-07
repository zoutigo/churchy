import { api } from './client';
import type { CreateActivityDto } from '@churchy/shared';

export interface Activity {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string | null;
  imageUrl: string | null;
  visibility: 'PUBLIC' | 'MEMBERS';
}

export const activitiesApi = {
  create: (parishId: string, dto: CreateActivityDto) =>
    api.post<Activity>(`/parishes/${parishId}/activities`, dto),
  findByParish: (parishId: string) => api.get<Activity[]>(`/parishes/${parishId}/activities`),
  remove: (parishId: string, id: string) =>
    api.delete<{ deleted: boolean }>(`/parishes/${parishId}/activities/${id}`),
};
