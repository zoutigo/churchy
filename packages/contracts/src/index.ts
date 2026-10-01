import { z } from 'zod';

/** Noms des files BullMQ — une file par domaine consommateur. */
export const QUEUES = {
  NOTIFICATIONS: 'notifications',
} as const;

/** Noms des jobs de la file `notifications`. */
export const NotificationJob = {
  CELEBRATION_PUBLISHED: 'celebration.published',
  EMAIL_VERIFICATION_REQUESTED: 'auth.email-verification-requested',
  PASSWORD_RESET_REQUESTED: 'auth.password-reset-requested',
  CONTACT_MESSAGE_RECEIVED: 'contact.message-received',
} as const;

export const celebrationPublishedPayloadSchema = z.object({
  celebrationId: z.string(),
  parishId: z.string(),
  title: z.string(),
  date: z.string().datetime(),
  publishedAt: z.string().datetime(),
});

export type CelebrationPublishedPayload = z.infer<typeof celebrationPublishedPayloadSchema>;

/** Email contenant un lien à usage unique (vérification d'email ou réinitialisation de mot de passe). */
export const authLinkEmailPayloadSchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  /** Lien complet et déjà signé ; le worker ne fait que l'envoyer. */
  url: z.string().url(),
  expiresAt: z.string().datetime(),
});

export type AuthLinkEmailPayload = z.infer<typeof authLinkEmailPayloadSchema>;

/** Message envoyé depuis la page Contact du site public : le worker le transmet à l'équipe Churchy. */
export const contactMessagePayloadSchema = z.object({
  name: z.string().min(1).max(100),
  /** Adresse de l'expéditeur : sert de « répondre à » (jamais d'expéditeur du message). */
  email: z.string().email(),
  topic: z.enum(['QUESTION', 'PARISH', 'PROBLEM', 'OTHER']),
  message: z.string().min(1).max(3000),
  receivedAt: z.string().datetime(),
});

export type ContactMessagePayload = z.infer<typeof contactMessagePayloadSchema>;
