import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PlatformPermission } from '@churchy/shared';
import { PlatformPermissionGuard } from './platform-permission.guard';

const ctx = (user: unknown) =>
  ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

const guardRequiring = (permission: PlatformPermission | undefined) => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(permission),
  } as unknown as Reflector;
  return new PlatformPermissionGuard(reflector);
};

describe('PlatformPermissionGuard', () => {
  it('laisse passer un rôle qui a la permission', () => {
    expect(guardRequiring('platform.users.read').canActivate(ctx({ role: 'SUPER_ADMIN' }))).toBe(
      true,
    );
    expect(guardRequiring('platform.users.read').canActivate(ctx({ role: 'ADMIN' }))).toBe(true);
    expect(guardRequiring('platform.access').canActivate(ctx({ role: 'MODERATOR' }))).toBe(true);
  });

  it('refuse un rôle sans la permission', () => {
    expect(() =>
      guardRequiring('platform.users.read').canActivate(ctx({ role: 'MODERATOR' })),
    ).toThrow(ForbiddenException);
    expect(() => guardRequiring('platform.access').canActivate(ctx({ role: 'USER' }))).toThrow(
      ForbiddenException,
    );
  });

  it('refuse une requête sans utilisateur ou avec un rôle inconnu', () => {
    expect(() => guardRequiring('platform.access').canActivate(ctx(undefined))).toThrow(
      ForbiddenException,
    );
    expect(() => guardRequiring('platform.access').canActivate(ctx({ role: 'ROOT' }))).toThrow(
      ForbiddenException,
    );
  });

  it('refuse par défaut une route sans permission déclarée', () => {
    expect(() => guardRequiring(undefined).canActivate(ctx({ role: 'SUPER_ADMIN' }))).toThrow(
      ForbiddenException,
    );
  });
});
