import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ERR,
  maskPhoneForLogs,
  type AddEmailDto,
  type AuthUserDto,
  type ChangePinDto,
  type LinkGoogleDto,
  type SetPasswordDto,
  type SetPhonePinDto,
  type UnlinkGoogleDto,
} from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthSecurityService, type RequestContext } from './auth-security.service';
import { AuthService, type AuthResult } from './auth.service';
import { USER_AUTH_INCLUDE, toAuthUserDto, type UserWithAuth } from './auth-user';
import { GoogleAuthService } from './google-auth.service';
import { PhoneAuthService } from './phone-auth.service';

const BCRYPT_ROUNDS = 10;

interface Proof {
  currentPassword?: string;
  currentPin?: string;
}

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

/**
 * « Sécurité du compte » : ajouter ou changer un moyen de connexion depuis une session ouverte.
 * Toute modification sensible exige une preuve (mot de passe ou PIN actuel) : une session volée ne suffit pas
 * à prendre le contrôle du compte. Un compte uniquement Google n'a rien à prouver.
 */
@Injectable()
export class AccountService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private phone: PhoneAuthService,
    private google: GoogleAuthService,
    private security: AuthSecurityService,
  ) {}

  private async reload(userId: string): Promise<UserWithAuth> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: USER_AUTH_INCLUDE,
    });
  }

  private async reloadDto(userId: string): Promise<AuthUserDto> {
    return toAuthUserDto(await this.reload(userId));
  }

  /** Vérifie la preuve demandée, avec verrouillage après plusieurs échecs. */
  private async assertProof(user: UserWithAuth, proof: Proof): Promise<void> {
    const key = `proof:${user.id}`;
    await this.security.assertNotBlocked('ACCOUNT_PROOF', key);

    let valid: boolean;
    if (user.passwordHash) {
      if (!proof.currentPassword) throw new BadRequestException(ERR.currentSecretRequired);
      valid = await bcrypt.compare(proof.currentPassword, user.passwordHash);
    } else if (user.phoneCredential) {
      if (!proof.currentPin) throw new BadRequestException(ERR.currentSecretRequired);
      valid = await this.phone.verifyPin(proof.currentPin, user.phoneCredential.pinHash);
    } else {
      return; // compte uniquement Google
    }

    if (!valid) {
      await this.security.recordFailure('ACCOUNT_PROOF', key);
      throw new BadRequestException(ERR.currentSecretInvalid);
    }
    await this.security.recordSuccess('ACCOUNT_PROOF', key);
  }

  /** Les anciennes sessions ne doivent pas survivre à un changement de secret : on en ouvre une neuve. */
  private async rotateSessions(userId: string): Promise<AuthResult> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const user = await this.reload(userId);
    return { user: toAuthUserDto(user), session: await this.auth.issueSession(user) };
  }

  /** Ajoute un email à un compte qui n'en a pas (création par téléphone) ; il reste à confirmer. */
  async addEmail(
    user: UserWithAuth,
    dto: AddEmailDto,
    context?: RequestContext,
  ): Promise<AuthUserDto> {
    if (user.email) throw new ConflictException(ERR.emailAlreadySet);
    await this.assertProof(user, dto);
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { email: dto.email, emailVerifiedAt: null },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(ERR.emailAlreadyUsed);
      throw err;
    }
    const updated = await this.reload(user.id);
    await this.auth.sendEmailVerification(updated);
    await this.security.audit({
      event: 'EMAIL_ADDED',
      status: 'SUCCESS',
      userId: user.id,
      principal: dto.email,
      context,
    });
    return toAuthUserDto(updated);
  }

  /** Crée le mot de passe (compte Google ou téléphone) ou le remplace. */
  async setPassword(
    user: UserWithAuth,
    dto: SetPasswordDto,
    context?: RequestContext,
  ): Promise<AuthResult> {
    if (!user.email) throw new BadRequestException(ERR.emailRequired);
    await this.assertProof(user, dto);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS) },
    });
    await this.security.audit({
      event: 'PASSWORD_SET',
      status: 'SUCCESS',
      userId: user.id,
      context,
    });
    return this.rotateSessions(user.id);
  }

  /** Ajoute la connexion par téléphone + PIN à un compte qui n'en a pas. */
  async setPhonePin(
    user: UserWithAuth,
    dto: SetPhonePinDto,
    context?: RequestContext,
  ): Promise<AuthResult> {
    if (user.phoneCredential) throw new ConflictException(ERR.pinAlreadySet);
    await this.assertProof(user, dto);
    try {
      await this.prisma.userPhoneCredential.create({
        data: {
          userId: user.id,
          phoneE164: dto.phone,
          pinHash: await this.phone.hashPin(dto.pin),
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(ERR.phoneAlreadyUsed);
      throw err;
    }
    await this.security.audit({
      event: 'PIN_SET',
      status: 'SUCCESS',
      userId: user.id,
      principal: maskPhoneForLogs(dto.phone),
      context,
    });
    return this.rotateSessions(user.id);
  }

  async changePin(
    user: UserWithAuth,
    dto: ChangePinDto,
    context?: RequestContext,
  ): Promise<AuthResult> {
    if (!user.phoneCredential) throw new BadRequestException(ERR.noPinSet);
    // Le PIN se change avec le PIN actuel (jamais avec le mot de passe) : on force la preuve par PIN.
    await this.assertProof({ ...user, passwordHash: null }, { currentPin: dto.currentPin });
    await this.prisma.userPhoneCredential.update({
      where: { id: user.phoneCredential.id },
      data: { pinHash: await this.phone.hashPin(dto.pin) },
    });
    await this.security.recordSuccess('PHONE_LOGIN', user.phoneCredential.phoneE164);
    await this.security.audit({
      event: 'PIN_CHANGED',
      status: 'SUCCESS',
      userId: user.id,
      context,
    });
    return this.rotateSessions(user.id);
  }

  async linkGoogle(
    user: UserWithAuth,
    dto: LinkGoogleDto,
    context?: RequestContext,
  ): Promise<AuthUserDto> {
    await this.assertProof(user, dto);
    await this.google.linkToAccount(user, dto.idToken, context);
    return this.reloadDto(user.id);
  }

  async unlinkGoogle(
    user: UserWithAuth,
    dto: UnlinkGoogleDto,
    context?: RequestContext,
  ): Promise<AuthUserDto> {
    if (!user.identities.some((i) => i.provider === 'GOOGLE')) {
      throw new BadRequestException(ERR.googleNotLinked);
    }
    // Il faut un autre moyen de se connecter, sinon le compte deviendrait inaccessible.
    if (!user.passwordHash && !user.phoneCredential) {
      throw new BadRequestException(ERR.lastLoginMethod);
    }
    await this.assertProof(user, dto);
    await this.prisma.userAuthIdentity.deleteMany({
      where: { userId: user.id, provider: 'GOOGLE' },
    });
    await this.security.audit({
      event: 'GOOGLE_UNLINKED',
      status: 'SUCCESS',
      provider: 'GOOGLE',
      userId: user.id,
      context,
    });
    return this.reloadDto(user.id);
  }
}
