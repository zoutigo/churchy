import { z } from 'zod';
import { ContentType } from '../enums/content-type.enum';

export const createContentSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  type: z.nativeEnum(ContentType),
  body: z.string().min(1, 'Contenu requis'),
  language: z.string().default('fr'),
  tags: z.array(z.string()).default([]),
});

export const updateContentSchema = createContentSchema.partial();

export type CreateContentDto = z.infer<typeof createContentSchema>;
export type UpdateContentDto = z.infer<typeof updateContentSchema>;
