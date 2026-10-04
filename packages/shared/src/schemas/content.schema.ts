import { z } from 'zod';
import { richTextSchema } from '../rich-text';
import { ContentType } from '../enums/content-type.enum';
import { ERR } from '../constants/error-codes.constants';

export const createContentSchema = z.object({
  title: z.string().min(1, ERR.titleRequired),
  type: z.nativeEnum(ContentType),
  body: richTextSchema(ERR.contentRequired),
  language: z.string().default('fr'),
  tags: z.array(z.string()).default([]),
});

export const updateContentSchema = createContentSchema.partial();

export type CreateContentDto = z.infer<typeof createContentSchema>;
export type UpdateContentDto = z.infer<typeof updateContentSchema>;
