import { z } from 'zod';
import { LOCALES } from '../constants/i18n.constants';
import { ERR } from '../constants/error-codes.constants';
import {
  isValidInternationalPhone,
  normalizeInternationalPhone,
} from '../constants/phone.constants';
import { PIN_REGEX, isWeakPin } from '../constants/pin.constants';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(ERR.emailInvalid),
  password: z.string().min(8, ERR.passwordMin8),
  firstName: z.string().min(1, ERR.firstNameRequired),
  lastName: z.string().min(1, ERR.lastNameRequired),
  /** Langue de l'interface au moment de l'inscription (français si absente). */
  locale: z.enum(LOCALES).optional(),
});

/** Formulaire d'inscription : le même schéma que l'API, plus la confirmation du mot de passe (jamais envoyée). */
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, ERR.confirmPasswordRequired) })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: ERR.passwordsMismatch,
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(ERR.emailInvalid),
  password: z.string().min(1, ERR.passwordRequired),
});

export const updateLocaleSchema = z.object({ locale: z.enum(LOCALES) });

export type RegisterDto = z.infer<typeof registerSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
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

// --- Téléphone + PIN -----------------------------------------------------------------------------

/** Numéro saisi → E.164 (« +237677123456 ») ; refusé s'il est incomplet pour son pays. */
export const phoneSchema = z
  .string({ required_error: ERR.phoneRequired })
  .trim()
  .min(1, ERR.phoneRequired)
  .transform(normalizeInternationalPhone)
  .refine(isValidInternationalPhone, ERR.phoneInvalid);

/** PIN à créer ou à changer : 6 chiffres, pas une suite évidente. */
export const newPinSchema = z
  .string({ required_error: ERR.pinRequired })
  .regex(PIN_REGEX, ERR.pinInvalid)
  .refine((pin) => !isWeakPin(pin), ERR.pinTooWeak);

/** À la connexion on ne rappelle pas les règles de création : un PIN faux est simplement faux. */
const pinInputSchema = z.string({ required_error: ERR.pinRequired }).min(1, ERR.pinRequired);

const withPinConfirmation = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object({ ...shape, confirmPin: z.string().min(1, ERR.confirmPinRequired) })
    .refine((data) => (data as { pin: string }).pin === data.confirmPin, {
      path: ['confirmPin'],
      message: ERR.pinsMismatch,
    });

export const registerPhoneSchema = z.object({
  phone: phoneSchema,
  pin: newPinSchema,
  firstName: z.string().min(1, ERR.firstNameRequired),
  lastName: z.string().min(1, ERR.lastNameRequired),
  locale: z.enum(LOCALES).optional(),
});

export const registerPhoneFormSchema = withPinConfirmation({
  phone: phoneSchema,
  pin: newPinSchema,
  firstName: z.string().min(1, ERR.firstNameRequired),
  lastName: z.string().min(1, ERR.lastNameRequired),
  locale: z.enum(LOCALES).optional(),
});

export const loginPhoneSchema = z.object({ phone: phoneSchema, pin: pinInputSchema });

export const forgotPinSchema = z.object({ phone: phoneSchema });

export const resetPinSchema = z.object({
  token: z.string().min(1, ERR.tokenRequired),
  pin: newPinSchema,
});

export const resetPinFormSchema = withPinConfirmation({ pin: newPinSchema });

export type RegisterPhoneDto = z.infer<typeof registerPhoneSchema>;
export type RegisterPhoneFormValues = z.infer<typeof registerPhoneFormSchema>;
export type LoginPhoneDto = z.infer<typeof loginPhoneSchema>;
export type ForgotPinDto = z.infer<typeof forgotPinSchema>;
export type ResetPinDto = z.infer<typeof resetPinSchema>;
export type ResetPinFormValues = z.infer<typeof resetPinFormSchema>;

// --- Google --------------------------------------------------------------------------------------

export const googleAuthSchema = z.object({
  /** Jeton d'identité délivré par Google Identity Services (vérifié par l'API, jamais cru sur parole). */
  idToken: z.string().min(1, ERR.googleTokenInvalid),
  locale: z.enum(LOCALES).optional(),
});

/** Lie Google à un compte email existant : le mot de passe prouve que le compte est bien le sien. */
export const googleLinkSchema = z.object({
  idToken: z.string().min(1, ERR.googleTokenInvalid),
  password: z.string().min(1, ERR.passwordRequired),
});

// --- Sécurité du compte (utilisateur connecté) ---------------------------------------------------

/**
 * Preuve demandée avant une modification sensible : le mot de passe si le compte en a un, sinon le PIN.
 * (Un compte uniquement Google n'a rien à prouver : sa session suffit.)
 */
const proofShape = {
  currentPassword: z.string().optional(),
  currentPin: z.string().optional(),
};

export const addEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email(ERR.emailInvalid),
  ...proofShape,
});

export const setPasswordSchema = z.object({
  password: z.string().min(8, ERR.passwordMin8),
  ...proofShape,
});

export const setPhonePinSchema = z.object({
  phone: phoneSchema,
  pin: newPinSchema,
  ...proofShape,
});

export const changePinSchema = z.object({
  currentPin: z.string().min(1, ERR.pinRequired),
  pin: newPinSchema,
});

export const changePinFormSchema = withPinConfirmation({
  currentPin: z.string().min(1, ERR.pinRequired),
  pin: newPinSchema,
});

export const linkGoogleSchema = z.object({
  idToken: z.string().min(1, ERR.googleTokenInvalid),
  ...proofShape,
});

export const unlinkGoogleSchema = z.object(proofShape);

export const adminPinResetSchema = z.object({ phone: phoneSchema });

export type GoogleAuthDto = z.infer<typeof googleAuthSchema>;
export type GoogleLinkDto = z.infer<typeof googleLinkSchema>;
export type AddEmailDto = z.infer<typeof addEmailSchema>;
export type SetPasswordDto = z.infer<typeof setPasswordSchema>;
export type SetPhonePinDto = z.infer<typeof setPhonePinSchema>;
export type ChangePinDto = z.infer<typeof changePinSchema>;
export type LinkGoogleDto = z.infer<typeof linkGoogleSchema>;
export type UnlinkGoogleDto = z.infer<typeof unlinkGoogleSchema>;
export type AdminPinResetDto = z.infer<typeof adminPinResetSchema>;
