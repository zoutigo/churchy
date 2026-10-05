import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_LOCALE,
  ERR,
  type AuthProvidersDto,
  type GoogleAuthDto,
  type GoogleLinkDto,
} from '@churchy/shared';
import { env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthSecurityService, type RequestContext } from './auth-security.service';
import { AuthService, type AuthResult } from './auth.service';
import { USER_AUTH_INCLUDE, toAuthUserDto, type UserWithAuth } from './auth-user';
import { GoogleTokenVerifier, type GoogleProfile } from './google-token.verifier';

export type GoogleAuthResult =
  { status: 'ok'; result: AuthResult } | { status: 'link_required'; email: string };

const BCRYPT_ROUNDS = 10;
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

/** Connexion avec Google : le jeton est toujours vérifié ici, jamais cru sur parole. */
@Injectable()
export class GoogleAuthService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private security: AuthSecurityService,
    private verifier: GoogleTokenVerifier,
  ) {}

  providers(): AuthProvidersDto {
    return {
      google:
        this.verifier.isConfigured() && env.GOOGLE_CLIENT_ID
          ? { clientId: env.GOOGLE_CLIENT_ID }
          : null,
    };
  }

  private async verifiedProfile(idToken: string): Promise<GoogleProfile> {
    if (!this.verifier.isConfigured())
      throw new ServiceUnavailableException(ERR.googleNotConfigured);
    const profile = await this.verifier.verify(idToken);
    if (!profile.emailVerified) throw new BadRequestException(ERR.googleEmailUnverified);
    return profile;
  }

  /**
   * - compte déjà lié → connexion ;
   * - aucun compte avec cet email → création (email vérifié par Google) ;
   * - un compte existe avec cet email → ne jamais fusionner en silence : `link_required` (le mot de passe
   *   du compte sera demandé), sauf si l'email de ce compte n'a jamais été vérifié (voir `takeOver`).
   */
  async login(dto: GoogleAuthDto, context?: RequestContext): Promise<GoogleAuthResult> {
    const profile = await this.verifiedProfile(dto.idToken);

    const identity = await this.prisma.userAuthIdentity.findUnique({
      where: { provider_providerAccountId: { provider: 'GOOGLE', providerAccountId: profile.sub } },
      include: { user: { include: USER_AUTH_INCLUDE } },
    });
    if (identity)
      return { status: 'ok', result: await this.signIn(identity.user, profile, context) };

    const existing = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: USER_AUTH_INCLUDE,
    });
    if (!existing)
      return { status: 'ok', result: await this.createAccount(profile, dto.locale, context) };

    if (!existing.emailVerifiedAt) {
      return { status: 'ok', result: await this.takeOver(existing, profile, context) };
    }
    await this.security.audit({
      event: 'LOGIN_GOOGLE',
      status: 'FAILURE',
      provider: 'GOOGLE',
      userId: existing.id,
      principal: profile.email,
      reasonCode: 'LINK_REQUIRED',
      context,
    });
    return { status: 'link_required', email: profile.email };
  }

  /** Confirme la liaison à un compte existant avec son mot de passe. */
  async linkWithPassword(dto: GoogleLinkDto, context?: RequestContext): Promise<AuthResult> {
    const profile = await this.verifiedProfile(dto.idToken);
    await this.security.assertNotBlocked('PASSWORD_LOGIN', profile.email);

    const user = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: USER_AUTH_INCLUDE,
    });
    if (!user) throw new NotFoundException(ERR.googleTokenInvalid);
    // Sans mot de passe, rien ne prouve que le compte est le sien : connexion par l'autre moyen d'abord.
    if (!user.passwordHash) {
      throw new BadRequestException(ERR.googleLinkLoginFirst);
    }
    if (user.identities.some((i) => i.provider === 'GOOGLE')) {
      throw new ConflictException(ERR.googleAlreadyLinked);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash ?? DUMMY_HASH);
    if (!valid) {
      await this.security.recordFailure('PASSWORD_LOGIN', profile.email);
      await this.security.audit({
        event: 'GOOGLE_LINKED',
        status: 'FAILURE',
        provider: 'GOOGLE',
        userId: user.id,
        principal: profile.email,
        reasonCode: 'INVALID_PASSWORD',
        context,
      });
      throw new BadRequestException(ERR.invalidCredentials);
    }
    await this.security.recordSuccess('PASSWORD_LOGIN', profile.email);

    await this.attachIdentity(user.id, profile);
    await this.security.audit({
      event: 'GOOGLE_LINKED',
      status: 'SUCCESS',
      provider: 'GOOGLE',
      userId: user.id,
      principal: profile.email,
      context,
    });
    return this.openSession(user.id);
  }

  /** Depuis « Sécurité » : lie Google au compte connecté (la preuve a été vérifiée par l'appelant). */
  async linkToAccount(
    user: UserWithAuth,
    idToken: string,
    context?: RequestContext,
  ): Promise<void> {
    const profile = await this.verifiedProfile(idToken);
    if (user.identities.some((i) => i.provider === 'GOOGLE')) {
      throw new ConflictException(ERR.googleAlreadyLinked);
    }
    await this.attachIdentity(user.id, profile);
    // Google a prouvé la propriété de cet email : on le confirme s'il est celui du compte.
    if (user.email === profile.email && !user.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }
    await this.security.audit({
      event: 'GOOGLE_LINKED',
      status: 'SUCCESS',
      provider: 'GOOGLE',
      userId: user.id,
      principal: profile.email,
      context,
    });
  }

  // --- interne -------------------------------------------------------------------------------

  private async attachIdentity(userId: string, profile: GoogleProfile) {
    try {
      await this.prisma.userAuthIdentity.create({
        data: { userId, provider: 'GOOGLE', providerAccountId: profile.sub, email: profile.email },
      });
    } catch (err) {
      // Ce compte Google est déjà lié à un autre compte Churchy (ou course entre deux requêtes).
      if (isUniqueViolation(err)) throw new ConflictException(ERR.googleLinkedElsewhere);
      throw err;
    }
  }

  private async openSession(userId: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: USER_AUTH_INCLUDE,
    });
    return { user: toAuthUserDto(user), session: await this.auth.issueSession(user) };
  }

  private async signIn(user: UserWithAuth, profile: GoogleProfile, context?: RequestContext) {
    await this.security.audit({
      event: 'LOGIN_GOOGLE',
      status: 'SUCCESS',
      provider: 'GOOGLE',
      userId: user.id,
      principal: profile.email,
      context,
    });
    return { user: toAuthUserDto(user), session: await this.auth.issueSession(user) };
  }

  private async createAccount(
    profile: GoogleProfile,
    locale: GoogleAuthDto['locale'],
    context?: RequestContext,
  ) {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: profile.email,
          emailVerifiedAt: new Date(),
          firstName: profile.firstName?.trim() || profile.email.split('@')[0],
          lastName: profile.lastName?.trim() || '-',
          locale: locale ?? DEFAULT_LOCALE,
          identities: {
            create: { provider: 'GOOGLE', providerAccountId: profile.sub, email: profile.email },
          },
        },
        include: USER_AUTH_INCLUDE,
      });
      await this.security.audit({
        event: 'REGISTER',
        status: 'SUCCESS',
        provider: 'GOOGLE',
        userId: user.id,
        principal: profile.email,
        context,
      });
      return { user: toAuthUserDto(user), session: await this.auth.issueSession(user) };
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(ERR.emailAlreadyUsed);
      throw err;
    }
  }

  /**
   * L'email du compte existant n'a jamais été confirmé, alors que Google, lui, certifie que cette adresse est
   * à la personne qui se connecte. Quelqu'un a donc pu s'inscrire avec l'adresse d'autrui : on retire les
   * identifiants posés par cette personne (mot de passe, PIN), on déconnecte toutes les sessions et on lie Google.
   */
  private async takeOver(existing: UserWithAuth, profile: GoogleProfile, context?: RequestContext) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash: null, emailVerifiedAt: now },
      }),
      this.prisma.userPhoneCredential.deleteMany({ where: { userId: existing.id } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: existing.id, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.authToken.updateMany({
        where: { userId: existing.id, usedAt: null },
        data: { usedAt: now },
      }),
    ]);
    await this.attachIdentity(existing.id, profile);
    await this.security.audit({
      event: 'ACCOUNT_TAKEOVER_CLEARED',
      status: 'SUCCESS',
      provider: 'GOOGLE',
      userId: existing.id,
      principal: profile.email,
      context,
    });
    return this.openSession(existing.id);
  }
}
