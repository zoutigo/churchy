import { api } from './client';
import type { CreateAnnouncementDto } from '@churchy/shared';

export interface Announcement {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  imageUrl: string | null;
  visibility: 'PUBLIC' | 'MEMBERS';
  publishedAt: string;
}

export const announcementsApi = {
  create: (parishId: string, dto: CreateAnnouncementDto) =>
    api.post<Announcement>(`/parishes/${parishId}/announcements`, dto),
  findByParish: (parishId: string) =>
    api.get<Announcement[]>(`/parishes/${parishId}/announcements`),
  remove: (parishId: string, id: string) =>
    api.delete<{ deleted: boolean }>(`/parishes/${parishId}/announcements/${id}`),
};
