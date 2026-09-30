import { z } from 'zod';
import { ParishRole } from '../enums/parish-role.enum';

export const createParishSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  description: z.string().optional(),
  city: z.string().min(1, 'Ville requise'),
  country: z.string().min(1, 'Pays requis'),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.nativeEnum(ParishRole),
});

export type CreateParishDto = z.infer<typeof createParishSchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
