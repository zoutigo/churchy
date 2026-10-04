import { z } from 'zod';
import { LOCALES } from '../constants/i18n.constants';
import { ERR } from '../constants/error-codes.constants';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(ERR.emailInvalid),
  password: z.string().min(8, ERR.passwordMin8),
  firstName: z.string().min(1, ERR.firstNameRequired),
  lastName: z.string().min(1, ERR.lastNameRequired),
  /** Langue de l'interface au moment de l'inscription (français si absente). */
  locale: z.enum(LOCALES).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(ERR.emailInvalid),
  password: z.string().min(1, ERR.passwordRequired),
});

export const updateLocaleSchema = z.object({ locale: z.enum(LOCALES) });

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(ERR.emailInvalid),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, ERR.tokenRequired),
  password: z.string().min(8, ERR.passwordMin8),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, ERR.tokenRequired),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type UpdateLocaleDto = z.infer<typeof updateLocaleSchema>;
