import type { Locale } from '../constants/i18n.constants';
import type { UserRole } from '../enums/user-role.enum';

export type {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  UpdateLocaleDto,
} from '../schemas/auth.schema';

/** Utilisateur tel qu'exposé par l'API (jamais de hash de mot de passe). */
export interface AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  /** Langue préférée du compte (interface et emails). */
  locale: Locale;
}

/**
 * Réponse de register / login / refresh. Les jetons ne sont PAS dans le corps :
 * ils voyagent dans des cookies httpOnly posés par l'API.
 */
export interface AuthResponse {
  user: AuthUserDto;
}
