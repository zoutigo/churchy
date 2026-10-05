import type { Prisma } from '@prisma/client';
import { DEFAULT_LOCALE, isLocale, type AuthUserDto, type UserRole } from '@churchy/shared';

/** Relations nécessaires pour savoir par quels moyens un compte peut se connecter. */
export const USER_AUTH_INCLUDE = {
  phoneCredential: true,
  identities: { select: { provider: true } },
} satisfies Prisma.UserInclude;

export type UserWithAuth = Prisma.UserGetPayload<{ include: typeof USER_AUTH_INCLUDE }>;

export function toAuthUserDto(user: UserWithAuth): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    phone: user.phoneCredential?.phoneE164 ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    emailVerified: user.email !== null && user.emailVerifiedAt !== null,
    locale: isLocale(user.locale) ? user.locale : DEFAULT_LOCALE,
    methods: {
      password: user.passwordHash !== null,
      pin: user.phoneCredential !== null,
      google: user.identities.some((i) => i.provider === 'GOOGLE'),
    },
  };
}

/** Langue du compte, avec repli sur la langue par défaut. */
export const localeOf = (user: { locale: string }) =>
  isLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
