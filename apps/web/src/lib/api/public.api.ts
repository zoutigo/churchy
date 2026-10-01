import { notFound } from 'next/navigation';
import type {
  ContactMessageDto,
  PublicActivity,
  PublicAnnouncement,
  PublicCelebration,
  PublicCelebrationSummary,
  PublicParish,
  PublicParishSearchResult,
} from '@churchy/shared';
import { ApiError, api } from './client';

export const publicApi = {
  searchParishes: (q: string | undefined, page = 1, limit = 12) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) params.set('q', q);
    return api.get<PublicParishSearchResult>(`/public/parishes?${params}`);
  },
  getParish: (id: string) => api.get<PublicParish>(`/public/parishes/${encodeURIComponent(id)}`),
  getCelebrations: (id: string) =>
    api.get<PublicCelebrationSummary[]>(`/public/parishes/${encodeURIComponent(id)}/celebrations`),
  getCelebration: (id: string) =>
    api.get<PublicCelebration>(`/public/celebrations/${encodeURIComponent(id)}`),
  getAnnouncements: (id: string) =>
    api.get<PublicAnnouncement[]>(`/public/parishes/${encodeURIComponent(id)}/announcements`),
  getActivities: (id: string) =>
    api.get<PublicActivity[]>(`/public/parishes/${encodeURIComponent(id)}/activities`),
  sendContact: (dto: ContactMessageDto) => api.post<{ sent: boolean }>('/contact', dto),
};

/** Dans une page serveur : un 404 de l'API devient la page « introuvable » de Next. */
export async function orNotFound<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}
