import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';

const ctx = (user: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as unknown as ExecutionContext;

describe('PlatformAdminGuard', () => {
  const guard = new PlatformAdminGuard();

  it('laisse passer un SUPER_ADMIN', () => {
    expect(guard.canActivate(ctx({ role: 'SUPER_ADMIN' }))).toBe(true);
  });

  it('refuse un utilisateur ordinaire, même administrateur de paroisse', () => {
    expect(() => guard.canActivate(ctx({ role: 'USER' }))).toThrow(ForbiddenException);
  });

  it('refuse une requête sans utilisateur', () => {
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
