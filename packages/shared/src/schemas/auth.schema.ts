import { z } from 'zod';
import { LOCALES } from '../constants/i18n.constants';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  /** Langue de l'interface au moment de l'inscription (français si absente). */
  locale: z.enum(LOCALES).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const updateLocaleSchema = z.object({ locale: z.enum(LOCALES) });

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Jeton requis'),
  password: z.string().min(8, 'Minimum 8 caractères'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Jeton requis'),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type UpdateLocaleDto = z.infer<typeof updateLocaleSchema>;
