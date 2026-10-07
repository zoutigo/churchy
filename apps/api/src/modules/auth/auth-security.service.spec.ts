import { HttpException, Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthSecurityService,
  FAILURE_WINDOW_MS,
  LOCK_DURATION_MS,
  RATE_LIMITS,
} from './auth-security.service';

type Fn = jest.Mock;

describe('AuthSecurityService', () => {
  let prisma: {
    authRateLimit: { findUnique: Fn; updateMany: Fn; upsert: Fn };
    authAuditLog: { create: Fn };
  };
  let service: AuthSecurityService;

  beforeEach(() => {
    prisma = {
      authRateLimit: {
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
      authAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    service = new AuthSecurityService(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('keyHash', () => {
    it('ne garde pas la clé en clair, insensible à la casse et aux espaces autour', () => {
      const hash = service.keyHash('Jean@Paroisse.fr ');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).not.toContain('jean');
      expect(hash).toBe(service.keyHash('jean@paroisse.fr'));
      expect(hash).not.toBe(service.keyHash('marie@paroisse.fr'));
    });
  });

  describe('assertNotBlocked', () => {
    it('laisse passer une clé inconnue', async () => {
      await expect(
        service.assertNotBlocked('PHONE_LOGIN', '+237677123456'),
      ).resolves.toBeUndefined();
    });

    it('laisse passer une clé dont le verrou est expiré', async () => {
      prisma.authRateLimit.findUnique.mockResolvedValue({
        blockedUntil: new Date(Date.now() - 1000),
      });
      await expect(service.assertNotBlocked('PHONE_LOGIN', 'k')).resolves.toBeUndefined();
    });

    it('refuse en 429 tant que le verrou court', async () => {
      prisma.authRateLimit.findUnique.mockResolvedValue({
        blockedUntil: new Date(Date.now() + 60_000),
      });
      const err = await service.assertNotBlocked('PHONE_LOGIN', 'k').catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(429);
      expect(err.message).toBe('tooManyAttempts');
    });

    it('interroge la clé hachée, par type de tentative', async () => {
      await service.assertNotBlocked('PHONE_LOGIN', '+237677123456');
      expect(prisma.authRateLimit.findUnique).toHaveBeenCalledWith({
        where: {
          purpose_keyHash: { purpose: 'PHONE_LOGIN', keyHash: service.keyHash('+237677123456') },
        },
      });
    });
  });

  describe('recordFailure', () => {
    it('incrémente de façon atomique, sans lire puis écrire', async () => {
      await service.recordFailure('PHONE_LOGIN', 'k');
      const upsert = prisma.authRateLimit.upsert.mock.calls[0][0];
      expect(upsert.update.failedCount).toEqual({ increment: 1 });
      expect(upsert.create.failedCount).toBe(1);
      expect(prisma.authRateLimit.findUnique).not.toHaveBeenCalled();
    });

    it('efface d’abord les échecs trop anciens', async () => {
      await service.recordFailure('PHONE_LOGIN', 'k');
      const stale = prisma.authRateLimit.updateMany.mock.calls[0][0];
      expect(stale.data).toEqual({ failedCount: 0 });
      const limit: Date = stale.where.lastFailedAt.lt;
      expect(Date.now() - limit.getTime()).toBeGreaterThanOrEqual(FAILURE_WINDOW_MS - 1000);
    });

    it('verrouille quand la limite du type est atteinte', async () => {
      const before = Date.now();
      await service.recordFailure('PHONE_LOGIN', 'k');
      const lock = prisma.authRateLimit.updateMany.mock.calls[1][0];
      expect(lock.where.failedCount).toEqual({ gte: RATE_LIMITS.PHONE_LOGIN.maxFailures });
      expect(lock.data.failedCount).toBe(0);
      expect(lock.data.blockedUntil.getTime()).toBeGreaterThanOrEqual(before + LOCK_DURATION_MS);
    });

    it('le PIN (6 chiffres) est verrouillé plus vite que le mot de passe', () => {
      expect(RATE_LIMITS.PHONE_LOGIN.maxFailures).toBeLessThan(
        RATE_LIMITS.PASSWORD_LOGIN.maxFailures,
      );
    });
  });

  describe('recordSuccess', () => {
    it('remet le compteur à zéro et lève le verrou', async () => {
      await service.recordSuccess('PHONE_LOGIN', 'k');
      expect(prisma.authRateLimit.updateMany).toHaveBeenCalledWith({
        where: { purpose: 'PHONE_LOGIN', keyHash: service.keyHash('k') },
        data: expect.objectContaining({ failedCount: 0, blockedUntil: null }),
      });
    });
  });

  describe('audit', () => {
    it('enregistre l’événement avec son contexte', async () => {
      await service.audit({
        event: 'LOGIN_PHONE',
        status: 'FAILURE',
        userId: 'u1',
        principal: '+237•••56',
        reasonCode: 'INVALID_CREDENTIALS',
        context: { ip: '1.2.3.4', userAgent: 'Mozilla' },
      });
      expect(prisma.authAuditLog.create).toHaveBeenCalledWith({
        data: {
          event: 'LOGIN_PHONE',
          status: 'FAILURE',
          userId: 'u1',
          provider: null,
          principal: '+237•••56',
          reasonCode: 'INVALID_CREDENTIALS',
          actorId: null,
          detail: null,
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla',
        },
      });
    });

    it('garde l’auteur et le détail d’un changement de rôle', async () => {
      await service.audit({
        event: 'PLATFORM_ROLE_CHANGED',
        status: 'SUCCESS',
        userId: 'cible',
        actorId: 'acteur',
        detail: 'USER>MODERATOR',
      });
      expect(prisma.authAuditLog.create.mock.calls[0][0].data).toMatchObject({
        userId: 'cible',
        actorId: 'acteur',
        detail: 'USER>MODERATOR',
      });
    });

    it('tronque un user-agent démesuré', async () => {
      await service.audit({
        event: 'REGISTER',
        status: 'SUCCESS',
        context: { userAgent: 'x'.repeat(1000) },
      });
      expect(prisma.authAuditLog.create.mock.calls[0][0].data.userAgent).toHaveLength(300);
    });

    it('n’échoue jamais : une panne du journal ne doit pas bloquer une connexion', async () => {
      prisma.authAuditLog.create.mockRejectedValue(new Error('db down'));
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      await expect(
        service.audit({ event: 'LOGIN_PASSWORD', status: 'SUCCESS' }),
      ).resolves.toBeUndefined();
      expect(error).toHaveBeenCalled();
    });
  });
});
