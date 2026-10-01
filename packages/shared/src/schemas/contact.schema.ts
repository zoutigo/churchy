import { z } from 'zod';

export const CONTACT_TOPICS = ['QUESTION', 'PARISH', 'PROBLEM', 'OTHER'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_TOPIC_LABELS: Record<ContactTopic, string> = {
  QUESTION: 'Poser une question',
  PARISH: 'Je représente une paroisse',
  PROBLEM: 'Signaler un problème',
  OTHER: 'Autre demande',
};

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(100),
  email: z.string().trim().toLowerCase().max(200).email('Email invalide'),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(10, 'Message trop court (min 10 caractères)').max(3000),
  /** Piège à robots : champ masqué que seul un script remplit. */
  website: z.string().optional(),
});

export type ContactMessageDto = z.infer<typeof contactMessageSchema>;
