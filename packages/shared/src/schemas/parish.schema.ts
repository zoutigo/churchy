import { z } from 'zod';
import { ParishRole } from '../enums/parish-role.enum';

/** Texte facultatif : une chaîne vide (champ de formulaire non rempli) équivaut à « non renseigné ». */
const optional = (schema: z.ZodType<string>) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(schema.optional());

/** Même chose pour une mise à jour : une chaîne vide efface la valeur (null). */
const clearable = (schema: z.ZodType<string>) =>
  z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v === undefined ? undefined : v ? v : null))
    .pipe(schema.nullable().optional());

/** Seuls http(s) sont acceptés : une URL `javascript:` ne doit jamais atteindre un href ou un src. */
const httpUrl = z
  .string()
  .trim()
  .max(500)
  .url('Adresse web invalide')
  .refine((v) => /^https?:\/\//i.test(v), 'Adresse web invalide (http ou https)');

const email = z.string().trim().max(200).email('Email invalide');
const text = (max: number) => z.string().trim().max(max, `${max} caractères maximum`);

/** Informations publiques d'une paroisse, communes à la création et à la modification. */
const publicFields = {
  district: text(100),
  address: text(200),
  mainChurch: text(150),
  phone: text(40),
  email,
  website: httpUrl,
  imageUrl: httpUrl,
};

export const createParishSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis (min 2 caractères)').max(150),
  description: optional(text(2000)),
  city: z.string().trim().min(1, 'Ville requise').max(100),
  country: z.string().trim().min(1, 'Pays requis').max(100),
  district: optional(publicFields.district),
  address: optional(publicFields.address),
  mainChurch: optional(publicFields.mainChurch),
  phone: optional(publicFields.phone),
  email: optional(publicFields.email),
  website: optional(publicFields.website),
  imageUrl: optional(publicFields.imageUrl),
});

/** Modification : tout est facultatif ; les champs d'information vidés repassent à `null`. */
export const updateParishSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis (min 2 caractères)').max(150).optional(),
  city: z.string().trim().min(1, 'Ville requise').max(100).optional(),
  country: z.string().trim().min(1, 'Pays requis').max(100).optional(),
  description: clearable(text(2000)),
  district: clearable(publicFields.district),
  address: clearable(publicFields.address),
  mainChurch: clearable(publicFields.mainChurch),
  phone: clearable(publicFields.phone),
  email: clearable(publicFields.email),
  website: clearable(publicFields.website),
  imageUrl: clearable(publicFields.imageUrl),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.nativeEnum(ParishRole),
});

/** Paramètres de la recherche publique de paroisses. */
export const searchParishesSchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateParishDto = z.infer<typeof createParishSchema>;
export type UpdateParishDto = z.infer<typeof updateParishSchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
export type SearchParishesQuery = z.infer<typeof searchParishesSchema>;
