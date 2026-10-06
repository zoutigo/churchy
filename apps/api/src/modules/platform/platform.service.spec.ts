import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PLATFORM_USERS_PAGE_SIZE } from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthSecurityService } from '../auth/auth-security.service';
import { PlatformService } from './platform.service';

type Fn = jest.Mock;

const user = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'a@b.fr',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'USER',
  suspendedAt: null,
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  ...over,
});

describe('PlatformService', () => {
  let prisma: {
    user: { findUnique: Fn; findMany: Fn; count: Fn; update: Fn };
    refreshToken: { updateMany: Fn };
    $transaction: Fn;
  };
  let security: { audit: Fn };
  let service: PlatformService;

  const superAdmin = { id: 'sa', role: 'SUPER_ADMIN' };
  const admin = { id: 'ad', role: 'ADMIN' };
  const moderator = { id: 'mo', role: 'MODERATOR' };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(user(data))),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(),
    };
    // Transaction interactive : on exécute le callback avec le même faux client ; sinon, tableau d'opérations.
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
    );
    security = { audit: jest.fn().mockResolvedValue(undefined) };
    service = new PlatformService(
      prisma as unknown as PrismaService,
      security as unknown as AuthSecurityService,
    );
  });

  describe('listUsers', () => {
    it('pagine, trie du plus récent au plus ancien et ne renvoie aucun secret', async () => {
      prisma.user.count.mockResolvedValue(45);
      prisma.user.findMany.mockResolvedValue([user({ passwordHash: 'secret' })]);
      const page = await service.listUsers({ page: 2 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: PLATFORM_USERS_PAGE_SIZE, take: PLATFORM_USERS_PAGE_SIZE }),
      );
      expect(page).toMatchObject({ total: 45, page: 2, pageSize: PLATFORM_USERS_PAGE_SIZE });
      expect(page.items[0]).not.toHaveProperty('passwordHash');
      expect(page.items[0]).toMatchObject({ id: 'u1', role: 'USER', suspendedAt: null });
    });

    it('cherche dans le nom, le prénom et l’email sans tenir compte de la casse', async () => {
      await service.listUsers({ q: ' dup ', page: 1 });
      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(3);
      expect(where.OR[0]).toEqual({ firstName: { contains: 'dup', mode: 'insensitive' } });
    });
  });

  describe('changeRole', () => {
    it('le SUPER_ADMIN nomme un ADMIN : rôle changé, sessions coupées, audit', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      const result = await service.changeRole(superAdmin, 'u1', 'ADMIN' as never);
      expect(result.role).toBe('ADMIN');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
      );
      expect(security.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'PLATFORM_ROLE_CHANGED',
          userId: 'u1',
          actorId: 'sa',
          detail: 'USER>ADMIN',
        }),
      );
    });

    it('l’ADMIN nomme un modérateur', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      await expect(service.changeRole(admin, 'u1', 'MODERATOR' as never)).resolves.toMatchObject({
        role: 'MODERATOR',
      });
    });

    it.each([
      ['promouvoir un ADMIN', 'USER', 'ADMIN'],
      ['promouvoir un SUPER_ADMIN', 'USER', 'SUPER_ADMIN'],
      ['rétrograder un ADMIN', 'ADMIN', 'USER'],
      ['révoquer le SUPER_ADMIN', 'SUPER_ADMIN', 'USER'],
    ])('l’ADMIN ne peut pas %s', async (_label, from, to) => {
      prisma.user.findUnique.mockResolvedValue(user({ role: from }));
      await expect(service.changeRole(admin, 'u1', to as never)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(security.audit).not.toHaveBeenCalled();
    });

    it('un modérateur ne change aucun rôle', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      await expect(
        service.changeRole(moderator, 'u1', 'MODERATOR' as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuse de retirer le dernier SUPER_ADMIN, même à lui-même', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ id: 'sa', role: 'SUPER_ADMIN' }));
      prisma.user.count.mockResolvedValue(0);
      await expect(service.changeRole(superAdmin, 'sa', 'ADMIN' as never)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('un SUPER_ADMIN peut en rétrograder un autre quand il en reste un actif', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ id: 'sa2', role: 'SUPER_ADMIN' }));
      prisma.user.count.mockResolvedValue(1);
      await expect(service.changeRole(superAdmin, 'sa2', 'ADMIN' as never)).resolves.toMatchObject({
        role: 'ADMIN',
      });
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { role: 'SUPER_ADMIN', id: { not: 'sa2' }, suspendedAt: null },
      });
    });

    it('même rôle : rien à faire, aucun audit, sessions conservées', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ role: 'MODERATOR' }));
      await service.changeRole(admin, 'u1', 'MODERATOR' as never);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(security.audit).not.toHaveBeenCalled();
    });

    it('compte introuvable : 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.changeRole(superAdmin, 'x', 'ADMIN' as never)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('suspension', () => {
    it('suspend un compte : date posée, sessions fermées, audit', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      const result = await service.suspend(admin, 'u1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { suspendedAt: expect.any(Date) },
      });
      expect(result.suspendedAt).not.toBeNull();
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(security.audit).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'ACCOUNT_SUSPENDED', userId: 'u1', actorId: 'ad' }),
      );
    });

    it('rétablit un compte suspendu', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ suspendedAt: new Date() }));
      const result = await service.reinstate(admin, 'u1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { suspendedAt: null },
      });
      expect(result.suspendedAt).toBeNull();
      expect(security.audit).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'ACCOUNT_REINSTATED' }),
      );
    });

    it('déjà dans l’état demandé : aucun effet', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ suspendedAt: new Date() }));
      await service.suspend(admin, 'u1');
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(security.audit).not.toHaveBeenCalled();
    });

    it.each([
      ['l’ADMIN suspend un ADMIN', admin, 'ad2', 'ADMIN'],
      ['l’ADMIN suspend le SUPER_ADMIN', admin, 'sa', 'SUPER_ADMIN'],
      ['le SUPER_ADMIN se suspend lui-même', superAdmin, 'sa', 'SUPER_ADMIN'],
      ['un modérateur suspend un utilisateur', moderator, 'u1', 'USER'],
    ])('refusé : %s', async (_label, actor, id, role) => {
      prisma.user.findUnique.mockResolvedValue(user({ id, role }));
      await expect(service.suspend(actor, id)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('le SUPER_ADMIN suspend un ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ id: 'ad2', role: 'ADMIN' }));
      await expect(service.suspend(superAdmin, 'ad2')).resolves.toBeDefined();
    });
  });
});
