import {
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthService } from './auth.service';
import { hashToken } from './token.util';

type Fn = jest.Mock;
interface PrismaMock {
  user: { findUnique: Fn; create: Fn; update: Fn };
  refreshToken: { create: Fn; findUnique: Fn; updateMany: Fn };
  authToken: { create: Fn; findUnique: Fn; update: Fn; updateMany: Fn };
  $transaction: Fn;
}

const dbUser = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'a@b.fr',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'USER',
  passwordHash: 'hash',
  emailVerifiedAt: null,
  ...over,
});

describe('AuthService', () => {
  const dto = { email: 'a@b.fr', password: 'password123', firstName: 'Jean', lastName: 'Dupont' };
  let prisma: PrismaMock;
  let jwt: { sign: Fn };
  let notifications: { emailVerificationRequested: Fn; passwordResetRequested: Fn };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      authToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt') };
    notifications = {
      emailVerificationRequested: jest.fn().mockResolvedValue(undefined),
      passwordResetRequested: jest.fn().mockResolvedValue(undefined),
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('register', () => {
    it('refuse un email déjà utilisé', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('hache le mot de passe, ouvre une session et envoie l’email de vérification', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
        dbUser(data),
      );

      const { user, session } = await service.register(dto);

      const created = prisma.user.create.mock.calls[0][0].data;
      expect(created.passwordHash).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, created.passwordHash)).toBe(true);
      expect(user).toEqual(expect.objectContaining({ email: dto.email, emailVerified: false }));
      expect(JSON.stringify(user)).not.toContain('passwordHash');
      expect(session.accessToken).toBe('signed.jwt');
      expect(notifications.emailVerificationRequested).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          url: expect.stringContaining('/verify-email?token='),
        }),
      );
    });

    it('n’échoue pas si l’email ne peut pas être enfilé', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(dbUser());
      notifications.emailVerificationRequested.mockRejectedValue(new Error('redis down'));
      // L'échec est journalisé volontairement : on le silence pour garder la sortie des tests lisible.
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await expect(service.register(dto)).resolves.toBeDefined();

      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });
  });

  describe('login', () => {
    it('refuse un utilisateur inconnu avec le même message qu’un mauvais mot de passe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: dto.email, password: 'x' })).rejects.toThrow(
        'Identifiants invalides',
      );
    });

    it('refuse un mauvais mot de passe', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({ passwordHash: await bcrypt.hash('autre', 4) }),
      );
      await expect(
        service.login({ email: dto.email, password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('ouvre une session pour des identifiants valides', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({ passwordHash: await bcrypt.hash(dto.password, 4) }),
      );
      const { user, session } = await service.login({ email: dto.email, password: dto.password });
      expect(user.id).toBe('u1');
      expect(session.accessToken).toBe('signed.jwt');
      const stored = prisma.refreshToken.create.mock.calls[0][0].data;
      // Seul le hash du refresh token est stocké.
      expect(stored.tokenHash).toBe(hashToken(session.refreshToken));
      expect(stored.tokenHash).not.toBe(session.refreshToken);
    });
  });

  describe('refresh', () => {
    const record = (over: Record<string, unknown> = {}) => ({
      id: 'rt1',
      userId: 'u1',
      familyId: 'fam1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: dbUser(),
      ...over,
    });

    it('refuse l’absence de cookie', async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('refuse un jeton inconnu', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('inconnu')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('fait tourner le jeton : révoque l’ancien et en émet un nouveau de la même famille', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(record());
      const { session } = await service.refresh('raw');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt1', revokedAt: null } }),
      );
      const created = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(created.familyId).toBe('fam1');
      expect(created.tokenHash).toBe(hashToken(session.refreshToken));
    });

    it('refuse un jeton expiré', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        record({ expiresAt: new Date(Date.now() - 1) }),
      );
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('révoque toute la famille si un jeton révoqué depuis longtemps est rejoué (vol probable)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        record({ revokedAt: new Date(Date.now() - 60_000) }),
      );
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: 'fam1', revokedAt: null } }),
      );
    });

    it('ne révoque pas la famille pour une réutilisation quasi simultanée (course entre onglets)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        record({ revokedAt: new Date(Date.now() - 1_000) }),
      );
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('perd la course si la révocation atomique ne touche aucune ligne', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(record());
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('ne fait rien sans cookie', async () => {
      await service.logout(undefined);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('révoque toute la famille de la session', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ familyId: 'fam1' });
      await service.logout('raw');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: 'fam1', revokedAt: null } }),
      );
    });
  });

  describe('forgotPassword', () => {
    it('ne fait rien (et ne révèle rien) pour un email inconnu', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.forgotPassword('inconnu@b.fr')).resolves.toBeUndefined();
      expect(notifications.passwordResetRequested).not.toHaveBeenCalled();
      expect(prisma.authToken.create).not.toHaveBeenCalled();
    });

    it('crée un jeton haché, invalide les précédents et enfile l’email avec le lien', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await service.forgotPassword('a@b.fr');

      expect(prisma.authToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', type: 'PASSWORD_RESET', usedAt: null } }),
      );
      const payload = notifications.passwordResetRequested.mock.calls[0][0];
      const rawToken = new URL(payload.url).searchParams.get('token') as string;
      expect(payload.url).toContain('/reset-password?token=');
      expect(prisma.authToken.create.mock.calls[0][0].data.tokenHash).toBe(hashToken(rawToken));
    });
  });

  describe('resetPassword', () => {
    const tokenRecord = (over: Record<string, unknown> = {}) => ({
      id: 't1',
      userId: 'u1',
      type: 'PASSWORD_RESET',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      ...over,
    });

    it.each([
      ['inconnu', null],
      ['déjà utilisé', tokenRecord({ usedAt: new Date() })],
      ['expiré', tokenRecord({ expiresAt: new Date(Date.now() - 1) })],
      ['d’un autre type', tokenRecord({ type: 'EMAIL_VERIFICATION' })],
    ])('refuse un jeton %s', async (_label, record) => {
      prisma.authToken.findUnique.mockResolvedValue(record);
      await expect(service.resetPassword('tok', 'nouveaumdp1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('change le mot de passe, consomme le jeton et déconnecte toutes les sessions', async () => {
      prisma.authToken.findUnique.mockResolvedValue(tokenRecord());
      await service.resetPassword('tok', 'nouveaumdp1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const newHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
      expect(await bcrypt.compare('nouveaumdp1', newHash)).toBe(true);
      expect(prisma.authToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' } }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('refuse un jeton invalide', async () => {
      prisma.authToken.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('x')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marque l’email comme vérifié et consomme le jeton', async () => {
      prisma.authToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        type: 'EMAIL_VERIFICATION',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      await service.verifyEmail('tok');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { emailVerifiedAt: expect.any(Date) } }),
      );
      expect(prisma.authToken.update).toHaveBeenCalled();
    });
  });

  describe('resendEmailVerification', () => {
    it('ne renvoie rien si l’email est déjà vérifié', async () => {
      await service.resendEmailVerification(dbUser({ emailVerifiedAt: new Date() }) as never);
      expect(notifications.emailVerificationRequested).not.toHaveBeenCalled();
    });

    it('renvoie le lien sinon', async () => {
      await service.resendEmailVerification(dbUser() as never);
      expect(notifications.emailVerificationRequested).toHaveBeenCalledTimes(1);
    });
  });
});
