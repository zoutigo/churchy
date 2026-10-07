import { z } from 'zod';
import { ContentVisibility } from '../enums/parish-status.enum';
import { richTextSchema } from '../rich-text';
import { ERR } from '../constants/error-codes.constants';

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
  .refine((v) => v === undefined || /^https?:\/\/\S+$/i.test(v), ERR.urlInvalid);

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, ERR.titleRequired).max(150, ERR.titleMax150),
  summary: optionalText(300),
  body: richTextSchema(ERR.contentRequired),
  imageUrl: optionalHttpUrl,
  visibility: z.nativeEnum(ContentVisibility).default(ContentVisibility.PUBLIC),
});

export const createActivitySchema = z.object({
  title: z.string().trim().min(1, ERR.titleRequired).max(150, ERR.titleMax150),
  description: richTextSchema(ERR.descriptionRequired),
  startsAt: z.string().datetime({ message: ERR.dateTimeRequired }),
  location: optionalText(200),
  imageUrl: optionalHttpUrl,
  visibility: z.nativeEnum(ContentVisibility).default(ContentVisibility.PUBLIC),
});

export type CreateAnnouncementDto = z.infer<typeof createAnnouncementSchema>;
export type CreateActivityDto = z.infer<typeof createActivitySchema>;
