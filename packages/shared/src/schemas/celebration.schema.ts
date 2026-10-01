import { z } from 'zod';
import { CelebrationType } from '../enums/celebration-type.enum';
import { ContentType } from '../enums/content-type.enum';

export const createCelebrationTemplateSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  type: z.nativeEnum(CelebrationType),
  description: z.string().optional(),
});

export const createTemplateStepSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  key: z.string().min(1, 'Clé requise'),
  order: z.number().int().positive(),
  expectedContentType: z.nativeEnum(ContentType).optional(),
  isRequired: z.boolean().default(true),
});

export const createCelebrationSchema = z.object({
  templateId: z.string().min(1, 'Modèle requis'),
  title: z.string().min(1, 'Titre requis'),
  date: z.string().datetime(),
  location: z.string().optional(),
  /** Visible du public avant la publication de la feuille (« feuille en préparation »). */
  announced: z.boolean().optional(),
});

export const setCelebrationAnnouncedSchema = z.object({ announced: z.boolean() });

export const updateCelebrationStepSchema = z.object({
  contentId: z.string().min(1).optional(),
  customText: z.string().optional(),
});

export type CreateCelebrationTemplateDto = z.infer<typeof createCelebrationTemplateSchema>;
export type CreateTemplateStepDto = z.infer<typeof createTemplateStepSchema>;
export type CreateCelebrationDto = z.infer<typeof createCelebrationSchema>;
export type SetCelebrationAnnouncedDto = z.infer<typeof setCelebrationAnnouncedSchema>;
export type UpdateCelebrationStepDto = z.infer<typeof updateCelebrationStepSchema>;
