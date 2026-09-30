import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import type { AuthUserDto, LoginDto, RegisterDto, UserRole } from '@churchy/shared';
import type { AuthLinkEmailPayload } from '@churchy/contracts';
import { env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { Session } from './auth-cookies';
import { generateToken, hashToken } from './token.util';

const BCRYPT_ROUNDS = 10;
/** Hash factice : comparé quand l'email est inconnu, pour que le temps de réponse ne le révèle pas. */
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
/** Une réutilisation de refresh token dans ce délai est traitée comme une course, pas comme un vol. */
const REFRESH_REUSE_GRACE_MS = 10_000;

export interface AuthResult {
  user: AuthUserDto;
  session: Session;
}

export function toAuthUserDto(user: User): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    await this.sendEmailVerification(user);
    return { user: toAuthUserDto(user), session: await this.issueSession(user) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new UnauthorizedException('Identifiants invalides');

    return { user: toAuthUserDto(user), session: await this.issueSession(user) };
  }

  /** Échange un refresh token contre une nouvelle paire (rotation : l'ancien est révoqué). */
  async refresh(rawToken: string | undefined): Promise<AuthResult> {
    if (!rawToken) throw new UnauthorizedException('Session absente');

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
    });
    if (!record) throw new UnauthorizedException('Session invalide');

    const now = new Date();
    if (record.revokedAt) {
      // Jeton déjà utilisé : soit une course entre deux onglets, soit un jeton volé et rejoué.
      if (now.getTime() - record.revokedAt.getTime() > REFRESH_REUSE_GRACE_MS) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: record.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        this.logger.warn(`Réutilisation d'un refresh token révoqué (utilisateur ${record.userId})`);
      }
      throw new UnauthorizedException('Session expirée');
    }
    if (record.expiresAt <= now) throw new UnauthorizedException('Session expirée');

    // Révocation atomique : si deux requêtes arrivent en même temps, une seule gagne.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: now },
    });
    if (count !== 1) throw new UnauthorizedException('Session expirée');

    return {
      user: toAuthUserDto(record.user),
      session: await this.issueSession(record.user, record.familyId),
    };
  }

  /** Révoque la session (toute la famille de jetons) côté serveur. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (!record) return;
    await this.prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Répond toujours de la même façon : ne révèle pas si l'email a un compte. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const { url, expiresAt } = await this.createLinkToken(
      user,
      'PASSWORD_RESET',
      'reset-password',
      PASSWORD_RESET_TTL_MS,
    );
    await this.enqueueSafely('passwordResetRequested', {
      email: user.email,
      firstName: user.firstName,
      url,
      expiresAt,
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.findUsableAuthToken(token, 'PASSWORD_RESET');
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
      }),
      this.prisma.authToken.update({ where: { id: record.id }, data: { usedAt: now } }),
      // Un mot de passe réinitialisé déconnecte toutes les sessions existantes.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.findUsableAuthToken(token, 'EMAIL_VERIFICATION');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
  }

  async resendEmailVerification(user: User): Promise<void> {
    if (user.emailVerifiedAt) return;
    await this.sendEmailVerification(user);
  }

  // --- interne -------------------------------------------------------------------------------

  private async issueSession(user: User, familyId: string = randomUUID()): Promise<Session> {
    const refreshToken = generateToken();
    const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        familyId,
        expiresAt: refreshExpiresAt,
      },
    });
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private async sendEmailVerification(user: User) {
    const { url, expiresAt } = await this.createLinkToken(
      user,
      'EMAIL_VERIFICATION',
      'verify-email',
      EMAIL_VERIFICATION_TTL_MS,
    );
    await this.enqueueSafely('emailVerificationRequested', {
      email: user.email,
      firstName: user.firstName,
      url,
      expiresAt,
    });
  }

  /** Crée un jeton à usage unique (les précédents encore valides du même type sont invalidés). */
  private async createLinkToken(
    user: User,
    type: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION',
    path: string,
    ttlMs: number,
  ) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.prisma.authToken.updateMany({
      where: { userId: user.id, type, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.authToken.create({
      data: { userId: user.id, type, tokenHash: hashToken(token), expiresAt },
    });
    return {
      url: `${env.FRONTEND_URL}/${path}?token=${encodeURIComponent(token)}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private async findUsableAuthToken(token: string, type: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION') {
    const record = await this.prisma.authToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.type !== type || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException('Lien invalide ou expiré');
    }
    return record;
  }

  /** L'email est un effet de bord : son échec ne doit pas faire échouer la requête. */
  private async enqueueSafely(
    method: 'passwordResetRequested' | 'emailVerificationRequested',
    payload: AuthLinkEmailPayload,
  ) {
    try {
      await this.notifications[method](payload);
    } catch (err) {
      this.logger.error(`Email non enfilé (${method})`, err as Error);
    }
  }
}
