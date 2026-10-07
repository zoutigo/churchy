import { z } from 'zod';
import { ParishDuty, ParishStatus } from '../enums/parish-status.enum';
import { isCompletePhone } from '../constants/phone.constants';
import { MAX_FAVORITE_PARISHES } from '../constants/business.constants';
import { isValidMonth, isValidTimezone } from '../schedule';
import { ERR } from '../constants/error-codes.constants';

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
  .url(ERR.urlInvalid)
  .refine((v) => /^https?:\/\//i.test(v), ERR.urlInvalidHttp);

const timezone = z.string().trim().refine(isValidTimezone, ERR.timezoneInvalid);
const email = z.string().trim().max(200).email(ERR.emailInvalid);
const text = (max: number) => z.string().trim().max(max, `${max} caractères maximum`);

/** Informations publiques d'une paroisse, communes à la création et à la modification. */
const publicFields = {
  district: text(100),
  address: text(200),
  addressComplement: text(200),
  mainChurch: text(150),
  phone: text(40).regex(/^[\d\s+().-]+$/, ERR.phoneInvalid),
  email,
  website: httpUrl,
  imageUrl: httpUrl,
};

export const createParishSchema = z.object({
  name: z.string().trim().min(2, ERR.nameMin2).max(150),
  description: optional(text(2000)),
  city: z.string().trim().min(1, ERR.cityRequired).max(100),
  country: z.string().trim().min(1, ERR.countryRequired).max(100),
  region: optional(text(100)),
  district: optional(publicFields.district),
  address: optional(publicFields.address),
  addressComplement: optional(publicFields.addressComplement),
  mainChurch: optional(publicFields.mainChurch),
  phone: optional(publicFields.phone),
  email: optional(publicFields.email),
  website: optional(publicFields.website),
  imageUrl: optional(publicFields.imageUrl),
  /** Fuseau horaire (IANA) ; par défaut celui du pays. */
  timezone: timezone.optional(),
});

/** Modification : tout est facultatif ; les champs d'information vidés repassent à `null`. */
export const updateParishSchema = z.object({
  name: z.string().trim().min(2, ERR.nameMin2).max(150).optional(),
  city: z.string().trim().min(1, ERR.cityRequired).max(100).optional(),
  country: z.string().trim().min(1, ERR.countryRequired).max(100).optional(),
  description: clearable(text(2000)),
  region: clearable(text(100)),
  district: clearable(publicFields.district),
  address: clearable(publicFields.address),
  addressComplement: clearable(publicFields.addressComplement),
  mainChurch: clearable(publicFields.mainChurch),
  phone: clearable(publicFields.phone),
  email: clearable(publicFields.email),
  website: clearable(publicFields.website),
  imageUrl: clearable(publicFields.imageUrl),
  timezone: timezone.optional(),
});

/**
 * Contrôle de formulaire : le numéro doit être complet pour le pays choisi (le serveur, lui, accepte tout
 * numéro bien formé, pour ne pas rejeter d'anciennes saisies ni les pays sans format connu).
 */
export const withCompletePhone = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data, ctx) => {
    const { phone, country } = data as { phone?: string | null; country?: string };
    if (phone && country && !isCompletePhone(country, phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: ERR.phoneIncomplete });
    }
  });

/** Statuts qu'un administrateur peut donner (le statut d'administrateur se donne par `PARISH_ADMIN`). */
export const updateMemberSchema = z
  .object({
    status: z.nativeEnum(ParishStatus).optional(),
    duties: z
      .array(z.nativeEnum(ParishDuty))
      .transform((d) => [...new Set(d)])
      .optional(),
  })
  .refine((v) => v.status !== undefined || v.duties !== undefined, ERR.memberUpdateEmpty);

/** Paramètres de la recherche publique de paroisses. */
export const searchParishesSchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/** Identifiants de paroisses (favoris) : dédoublonnés, bornés par `MAX_FAVORITE_PARISHES`. */
const parishIdList = z
  .array(z.string().trim().min(1).max(64))
  .transform((ids) => [...new Set(ids)])
  .pipe(
    z
      .array(z.string())
      .max(MAX_FAVORITE_PARISHES, `${MAX_FAVORITE_PARISHES} paroisses favorites au maximum`),
  );

/** Résumés de paroisses par identifiants (`?ids=a,b,c`), pour l'affichage des favoris. */
export const parishIdsQuerySchema = z.object({
  ids: z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(parishIdList),
});

/** Fusion des favoris d'un visiteur dans son compte à la connexion. */
export const mergeFavoritesSchema = z.object({ parishIds: parishIdList });

/** Calendrier public : un mois (« AAAA-MM »), le mois courant par défaut. */
export const calendarQuerySchema = z.object({
  month: z
    .string()
    .refine(isValidMonth, ERR.monthInvalid)
    .refine((m) => m >= '2020-01' && m <= '2100-12', ERR.monthOutOfRange)
    .optional(),
});

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type CreateParishDto = z.infer<typeof createParishSchema>;
export type UpdateParishDto = z.infer<typeof updateParishSchema>;
export type UpdateMemberDto = z.infer<typeof updateMemberSchema>;
export type ParishIdsQuery = z.infer<typeof parishIdsQuerySchema>;
export type MergeFavoritesDto = z.infer<typeof mergeFavoritesSchema>;
export type SearchParishesQuery = z.infer<typeof searchParishesSchema>;

/** Liste des membres d'une paroisse (administrateur) : recherche par nom, filtre de statut, page. */
export const listParishMembersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.nativeEnum(ParishStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type ListParishMembersQuery = z.infer<typeof listParishMembersSchema>;
