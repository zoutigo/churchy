import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalHttpUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || /^https?:\/\/\S+$/i.test(v), 'Adresse web invalide');

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(150, '150 caractères maximum'),
  summary: optionalText(300),
  body: z.string().trim().min(1, 'Contenu requis').max(10000, '10 000 caractères maximum'),
  imageUrl: optionalHttpUrl,
});

export const createActivitySchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(150, '150 caractères maximum'),
  description: z.string().trim().min(1, 'Description requise').max(10000),
  startsAt: z.string().datetime({ message: 'Date et heure requises' }),
  location: optionalText(200),
  imageUrl: optionalHttpUrl,
});

export type CreateAnnouncementDto = z.infer<typeof createAnnouncementSchema>;
export type CreateActivityDto = z.infer<typeof createActivitySchema>;
