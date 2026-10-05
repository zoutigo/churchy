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
  /** Absent d'un compte créé par téléphone tant qu'aucun email n'a été ajouté. */
  email: string | null;
  /** Numéro international (E.164) de la connexion par PIN, s'il existe. */
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  /** Langue préférée du compte (interface et emails). */
  locale: Locale;
  /** Moyens de connexion du compte (jamais de secret). */
  methods: AuthMethods;
}

export interface AuthMethods {
  password: boolean;
  pin: boolean;
  google: boolean;
}

/** Réponse de `POST /auth/google` : connecté, ou liaison à confirmer avec le mot de passe du compte existant. */
export type GoogleAuthResponse =
  ({ status: 'ok' } & AuthResponse) | { status: 'link_required'; email: string };

/** Lien de réinitialisation de PIN remis par un administrateur de la plateforme. */
export interface PinResetLinkDto {
  url: string;
  expiresAt: string;
  firstName: string;
  lastName: string;
}

/** Fournisseurs de connexion activés sur ce serveur. */
export interface AuthProvidersDto {
  google: { clientId: string } | null;
}

/**
 * Réponse de register / login / refresh. Les jetons ne sont PAS dans le corps :
 * ils voyagent dans des cookies httpOnly posés par l'API.
 */
export interface AuthResponse {
  user: AuthUserDto;
}
