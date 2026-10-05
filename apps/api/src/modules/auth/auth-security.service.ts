import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  AuthAuditEvent,
  AuthAuditStatus,
  AuthProvider,
  AuthRateLimitPurpose,
} from '@prisma/client';
import { ERR } from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';

/** Origine d'une requête, pour le journal d'audit. */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

/** Échecs tolérés avant verrouillage, par type de tentative. */
export const RATE_LIMITS: Record<AuthRateLimitPurpose, { maxFailures: number }> = {
  // Un PIN à 6 chiffres n'a que 10⁶ combinaisons : on verrouille vite.
  PHONE_LOGIN: { maxFailures: 5 },
  PASSWORD_LOGIN: { maxFailures: 10 },
  ACCOUNT_PROOF: { maxFailures: 5 },
};

export const LOCK_DURATION_MS = 15 * 60 * 1000;
/** Des échecs espacés de plus d'une heure ne s'additionnent pas. */
export const FAILURE_WINDOW_MS = 60 * 60 * 1000;

interface AuditInput {
  event: AuthAuditEvent;
  status: AuthAuditStatus;
  userId?: string | null;
  provider?: AuthProvider;
  /** Déjà masqué (téléphone) ou non sensible (email). */
  principal?: string;
  reasonCode?: string;
  context?: RequestContext;
}

/** Verrouillage temporaire des tentatives de connexion et journal d'audit. */
@Injectable()
export class AuthSecurityService {
  private readonly logger = new Logger(AuthSecurityService.name);

  constructor(private prisma: PrismaService) {}

  /** Clé hachée : le compteur ne garde ni numéro ni email en clair. */
  keyHash(key: string): string {
    return createHash('sha256').update(key.trim().toLowerCase()).digest('hex');
  }

  /** Refuse (429) tant que la clé est verrouillée. */
  async assertNotBlocked(purpose: AuthRateLimitPurpose, key: string): Promise<void> {
    const row = await this.prisma.authRateLimit.findUnique({
      where: { purpose_keyHash: { purpose, keyHash: this.keyHash(key) } },
    });
    if (row?.blockedUntil && row.blockedUntil > new Date()) {
      throw new HttpException(ERR.tooManyAttempts, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /**
   * Compte un échec. Chaque étape est atomique côté base (incrément, puis verrouillage conditionnel) : des
   * essais lancés en parallèle ne permettent pas de dépasser la limite.
   */
  async recordFailure(purpose: AuthRateLimitPurpose, key: string): Promise<void> {
    const keyHash = this.keyHash(key);
    const now = new Date();
    // Des échecs anciens ne s'additionnent pas aux nouveaux.
    await this.prisma.authRateLimit.updateMany({
      where: {
        purpose,
        keyHash,
        lastFailedAt: { lt: new Date(now.getTime() - FAILURE_WINDOW_MS) },
      },
      data: { failedCount: 0 },
    });
    await this.prisma.authRateLimit.upsert({
      where: { purpose_keyHash: { purpose, keyHash } },
      create: { purpose, keyHash, failedCount: 1, lastFailedAt: now },
      update: { failedCount: { increment: 1 }, lastFailedAt: now },
    });
    await this.prisma.authRateLimit.updateMany({
      where: { purpose, keyHash, failedCount: { gte: RATE_LIMITS[purpose].maxFailures } },
      data: { failedCount: 0, blockedUntil: new Date(now.getTime() + LOCK_DURATION_MS) },
    });
  }

  async recordSuccess(purpose: AuthRateLimitPurpose, key: string): Promise<void> {
    await this.prisma.authRateLimit.updateMany({
      where: { purpose, keyHash: this.keyHash(key) },
      data: { failedCount: 0, blockedUntil: null, lastSuccessAt: new Date() },
    });
  }

  /** Un échec d'audit ne doit jamais faire échouer une connexion. */
  async audit(input: AuditInput): Promise<void> {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          event: input.event,
          status: input.status,
          userId: input.userId ?? null,
          provider: input.provider ?? null,
          principal: input.principal ?? null,
          reasonCode: input.reasonCode ?? null,
          ipAddress: input.context?.ip ?? null,
          userAgent: input.context?.userAgent?.slice(0, 300) ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Audit non enregistré (${input.event})`, err as Error);
    }
  }
}
