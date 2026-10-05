import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_LOCALE,
  ERR,
  maskPhoneForLogs,
  type LoginPhoneDto,
  type PinResetLinkDto,
  type RegisterPhoneDto,
} from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthSecurityService, type RequestContext } from './auth-security.service';
import {
  ADMIN_PIN_RESET_TTL_MS,
  AuthService,
  PIN_RESET_TTL_MS,
  type AuthResult,
} from './auth.service';
import { USER_AUTH_INCLUDE, localeOf, toAuthUserDto } from './auth-user';
import { hashPin, pinHashNeedsUpgrade, verifyPin } from './pin-hash';

const BCRYPT_ROUNDS = 10;
/** Comparé quand le numéro est inconnu : le temps de réponse ne révèle pas s'il a un compte. */
const DUMMY_PIN_HASH = bcrypt.hashSync('000000-dummy', BCRYPT_ROUNDS);

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

/** Connexion par téléphone + PIN : inscription, connexion, récupération par email ou lien d'administrateur. */
@Injectable()
export class PhoneAuthService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private security: AuthSecurityService,
  ) {}

  hashPin(pin: string): Promise<string> {
    return hashPin(pin);
  }

  verifyPin(pin: string, hash: string | undefined): Promise<boolean> {
    return verifyPin(pin, hash ?? DUMMY_PIN_HASH);
  }

  /** Crée un compte sans email ni mot de passe. Le numéro reste « non vérifié » (pas encore de SMS). */
  async register(dto: RegisterPhoneDto, context?: RequestContext): Promise<AuthResult> {
    const taken = await this.prisma.userPhoneCredential.findUnique({
      where: { phoneE164: dto.phone },
    });
    if (taken) throw new ConflictException(ERR.phoneAlreadyUsed);

    try {
      const user = await this.prisma.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          locale: dto.locale ?? DEFAULT_LOCALE,
          phoneCredential: {
            create: { phoneE164: dto.phone, pinHash: await this.hashPin(dto.pin) },
          },
        },
        include: USER_AUTH_INCLUDE,
      });
      await this.security.audit({
        event: 'REGISTER',
        status: 'SUCCESS',
        userId: user.id,
        principal: maskPhoneForLogs(dto.phone),
        context,
      });
      return { user: toAuthUserDto(user), session: await this.auth.issueSession(user) };
    } catch (err) {
      // Deux inscriptions simultanées avec le même numéro : la base tranche.
      if (isUniqueViolation(err)) throw new ConflictException(ERR.phoneAlreadyUsed);
      throw err;
    }
  }

  async login(dto: LoginPhoneDto, context?: RequestContext): Promise<AuthResult> {
    await this.security.assertNotBlocked('PHONE_LOGIN', dto.phone);
    const credential = await this.prisma.userPhoneCredential.findUnique({
      where: { phoneE164: dto.phone },
      include: { user: { include: USER_AUTH_INCLUDE } },
    });
    const valid = await this.verifyPin(dto.pin, credential?.pinHash);
    const principal = maskPhoneForLogs(dto.phone);

    if (!credential || !valid) {
      await this.security.recordFailure('PHONE_LOGIN', dto.phone);
      await this.security.audit({
        event: 'LOGIN_PHONE',
        status: 'FAILURE',
        userId: credential?.userId,
        principal,
        reasonCode: 'INVALID_CREDENTIALS',
        context,
      });
      throw new UnauthorizedException(ERR.invalidCredentials);
    }

    await this.security.recordSuccess('PHONE_LOGIN', dto.phone);
    // PIN enregistré avant l'introduction du poivre : on le reprotège maintenant qu'on connaît sa valeur.
    if (pinHashNeedsUpgrade(credential.pinHash)) {
      await this.prisma.userPhoneCredential.update({
        where: { id: credential.id },
        data: { pinHash: await this.hashPin(dto.pin) },
      });
    }
    await this.security.audit({
      event: 'LOGIN_PHONE',
      status: 'SUCCESS',
      userId: credential.userId,
      principal,
      context,
    });
    return {
      user: toAuthUserDto(credential.user),
      session: await this.auth.issueSession(credential.user),
    };
  }

  /**
   * Envoie un lien de réinitialisation à l'email **vérifié** du compte. Ne répond jamais autrement : on ne
   * révèle ni l'existence du numéro, ni l'absence d'email. (Sans email : un administrateur de la plateforme
   * peut remettre un lien, ou un SMS quand un opérateur sera branché.)
   */
  async requestPinReset(phone: string, context?: RequestContext): Promise<void> {
    await this.security.assertNotBlocked('ACCOUNT_PROOF', `pin-reset:${phone}`);
    const credential = await this.prisma.userPhoneCredential.findUnique({
      where: { phoneE164: phone },
      include: { user: true },
    });
    // Compte les demandes (réussies ou non) : on ne laisse pas inonder une boîte mail de liens.
    await this.security.recordFailure('ACCOUNT_PROOF', `pin-reset:${phone}`);
    const user = credential?.user;
    await this.security.audit({
      event: 'PIN_RESET_REQUESTED',
      status: user?.email && user.emailVerifiedAt ? 'SUCCESS' : 'FAILURE',
      userId: user?.id,
      principal: maskPhoneForLogs(phone),
      reasonCode: !user
        ? 'UNKNOWN_PHONE'
        : !user.email || !user.emailVerifiedAt
          ? 'NO_VERIFIED_EMAIL'
          : undefined,
      context,
    });
    if (!user?.email || !user.emailVerifiedAt) return;

    const { url, expiresAt } = await this.auth.createLinkToken(
      user,
      'PIN_RESET',
      'reset-pin',
      PIN_RESET_TTL_MS,
    );
    await this.auth.enqueueSafely('pinResetRequested', {
      email: user.email,
      firstName: user.firstName,
      url,
      locale: localeOf(user),
      expiresAt,
    });
  }

  /** Lien à usage unique (par email ou remis par un administrateur) : fixe un nouveau PIN. */
  async resetPin(token: string, pin: string, context?: RequestContext): Promise<void> {
    const record = await this.auth.findUsableAuthToken(token, 'PIN_RESET');
    const credential = await this.prisma.userPhoneCredential.findUnique({
      where: { userId: record.userId },
    });
    if (!credential) throw new BadRequestException(ERR.linkInvalidOrExpired);

    const now = new Date();
    // Marquer le jeton d'abord, de façon conditionnelle : deux requêtes simultanées ne peuvent pas l'utiliser deux fois.
    const claimed = await this.prisma.authToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw new BadRequestException(ERR.linkInvalidOrExpired);

    await this.prisma.$transaction([
      this.prisma.userPhoneCredential.update({
        where: { id: credential.id },
        data: { pinHash: await this.hashPin(pin) },
      }),
      // Un PIN réinitialisé déconnecte toutes les sessions existantes.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.security.recordSuccess('PHONE_LOGIN', credential.phoneE164);
    await this.security.audit({
      event: 'PIN_RESET_COMPLETED',
      status: 'SUCCESS',
      userId: record.userId,
      principal: maskPhoneForLogs(credential.phoneE164),
      context,
    });
  }

  /** Administrateur de la plateforme : fabrique un lien de réinitialisation pour un compte sans email. */
  async issuePinResetLink(
    adminId: string,
    phone: string,
    context?: RequestContext,
  ): Promise<PinResetLinkDto> {
    const credential = await this.prisma.userPhoneCredential.findUnique({
      where: { phoneE164: phone },
      include: { user: true },
    });
    if (!credential) throw new NotFoundException(ERR.userNotFoundByPhone);

    const { url, expiresAt } = await this.auth.createLinkToken(
      credential.user,
      'PIN_RESET',
      'reset-pin',
      ADMIN_PIN_RESET_TTL_MS,
    );
    await this.security.audit({
      event: 'PIN_RESET_ISSUED_BY_ADMIN',
      status: 'SUCCESS',
      userId: credential.userId,
      principal: maskPhoneForLogs(phone),
      reasonCode: `admin:${adminId}`,
      context,
    });
    return {
      url,
      expiresAt,
      firstName: credential.user.firstName,
      lastName: credential.user.lastName,
    };
  }
}
