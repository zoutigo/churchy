import { z } from 'zod';

/** Noms des files BullMQ — une file par domaine consommateur. */
export const QUEUES = {
  NOTIFICATIONS: 'notifications',
} as const;

/** Noms des jobs de la file `notifications`. */
export const NotificationJob = {
  CELEBRATION_PUBLISHED: 'celebration.published',
} as const;

export const celebrationPublishedPayloadSchema = z.object({
  celebrationId: z.string(),
  parishId: z.string(),
  title: z.string(),
  date: z.string().datetime(),
  publishedAt: z.string().datetime(),
});

export type CelebrationPublishedPayload = z.infer<typeof celebrationPublishedPayloadSchema>;
