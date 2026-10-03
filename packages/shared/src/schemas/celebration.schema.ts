import { z } from 'zod';
import { CelebrationType } from '../enums/celebration-type.enum';
import { ContentType } from '../enums/content-type.enum';
import { hasRichContent } from '../rich-text';
import { MAX_OCCURRENCES_PER_REQUEST, isValidDateString, isValidTimeString } from '../schedule';

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

const localDate = z.string().refine(isValidDateString, 'Date invalide (format AAAA-MM-JJ)');
const localTime = z.string().refine(isValidTimeString, 'Heure invalide (format HH:mm)');

/** Planning d'une série : dates ponctuelles ou récurrence hebdomadaire (heure locale de la paroisse). */
const scheduleBaseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('dates'),
    dates: z
      .array(z.object({ date: localDate, time: localTime }))
      .min(1, 'Au moins une date')
      .max(MAX_OCCURRENCES_PER_REQUEST, `${MAX_OCCURRENCES_PER_REQUEST} dates maximum`),
  }),
  z.object({
    kind: z.literal('recurrence'),
    startDate: localDate,
    endDate: localDate,
    time: localTime,
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Choisissez au moins un jour').max(7),
  }),
]);

/** Planning avec contrôle de cohérence (la fin d'une récurrence suit son début). */
export const scheduleSchema = scheduleBaseSchema.superRefine((v, ctx) => {
  if (v.kind === 'recurrence' && v.endDate < v.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'La fin doit être après le début',
    });
  }
});

export const CELEBRATION_DESCRIPTION_MAX_LENGTH = 20_000;
export const INTERNAL_NOTE_MAX_LENGTH = 2_000;

/** Texte facultatif : vide = non renseigné. */
const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Même chose en modification : une chaîne vide efface la valeur (null). */
const clearableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

/** Description publique (HTML de l'éditeur, nettoyé par l'API). */
const optionalDescription = z
  .string()
  .max(CELEBRATION_DESCRIPTION_MAX_LENGTH, 'Description trop longue')
  .optional()
  .transform((v) => (v && hasRichContent(v) ? v : undefined));
const clearableDescription = z
  .string()
  .max(CELEBRATION_DESCRIPTION_MAX_LENGTH, 'Description trop longue')
  .nullish()
  .transform((v) => (v === undefined ? undefined : v && hasRichContent(v) ? v : null));

/** Création d'une série de célébrations (une ou plusieurs dates). */
export const createCelebrationSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(150, '150 caractères maximum'),
  type: z.nativeEnum(CelebrationType),
  location: optionalString(150),
  /** Visible du public (toutes les dates), feuille « en préparation » jusqu'à sa publication. */
  announced: z.boolean().optional(),
  description: optionalDescription,
  /** Note interne : réservée à l'équipe de préparation, jamais publique. */
  internalNote: optionalString(INTERNAL_NOTE_MAX_LENGTH),
  /** Modèle de feuille par défaut (facultatif ; modifiable à la préparation de chaque messe). */
  templateId: z.string().min(1).optional(),
  schedule: scheduleSchema,
});

export const updateCelebrationSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(150, '150 caractères maximum').optional(),
  type: z.nativeEnum(CelebrationType).optional(),
  location: clearableString(150),
  announced: z.boolean().optional(),
  description: clearableDescription,
  internalNote: clearableString(INTERNAL_NOTE_MAX_LENGTH),
  defaultTemplateId: z.string().min(1).nullish(),
});

/** Ajoute des dates à une série existante (prolongation). */
export const addOccurrencesSchema = z.object({ schedule: scheduleSchema });

export const updateOccurrenceSchema = z.object({
  start: z.object({ date: localDate, time: localTime }).optional(),
  description: clearableDescription,
  internalNote: clearableString(INTERNAL_NOTE_MAX_LENGTH),
});

export const cancelOccurrenceSchema = z.object({ reason: optionalString(200) });

/**
 * Feuille de préparation d'une date. `templateId` absent = modèle par défaut de la série ;
 * `null` = feuille vide, construite à la volée.
 */
export const createSheetSchema = z.object({ templateId: z.string().min(1).nullish() });

export const changeSheetTemplateSchema = z.object({
  templateId: z.string().min(1).nullable(),
  /** Aperçu : ne modifie rien, indique ce qui serait conservé ou retiré. */
  dryRun: z.boolean().optional(),
});

export const addSheetStepSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(100),
  expectedContentType: z.nativeEnum(ContentType).optional(),
});

export const updateCelebrationStepSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  contentId: z.string().min(1).nullish(),
  customText: z.string().max(20_000).nullish(),
});

export const reorderSheetStepsSchema = z.object({
  stepIds: z.array(z.string().min(1)).min(1),
});

export type CreateCelebrationTemplateDto = z.infer<typeof createCelebrationTemplateSchema>;
export type CreateTemplateStepDto = z.infer<typeof createTemplateStepSchema>;
export type CreateCelebrationDto = z.infer<typeof createCelebrationSchema>;
export type UpdateCelebrationDto = z.infer<typeof updateCelebrationSchema>;
export type AddOccurrencesDto = z.infer<typeof addOccurrencesSchema>;
export type UpdateOccurrenceDto = z.infer<typeof updateOccurrenceSchema>;
export type CancelOccurrenceDto = z.infer<typeof cancelOccurrenceSchema>;
export type CreateSheetDto = z.infer<typeof createSheetSchema>;
export type ChangeSheetTemplateDto = z.infer<typeof changeSheetTemplateSchema>;
export type AddSheetStepDto = z.infer<typeof addSheetStepSchema>;
export type UpdateCelebrationStepDto = z.infer<typeof updateCelebrationStepSchema>;
export type ReorderSheetStepsDto = z.infer<typeof reorderSheetStepsSchema>;
