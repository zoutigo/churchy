import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERR, hasPlatformPermission, type PlatformPermission } from '@churchy/shared';
import { PLATFORM_PERMISSION_KEY } from '../decorators/platform-permission.decorator';

/**
 * Réservé aux comptes qui ont la permission de plateforme demandée (`@RequirePlatformPermission`).
 * À placer après `JwtAuthGuard` : `request.user` est relu **en base** à chaque requête (`JwtStrategy`), donc un
 * rôle retiré ou un compte suspendu perd son accès immédiatement, sans attendre l'expiration du jeton.
 * Sans décorateur, le garde refuse : une route de plateforme oubliée n'est jamais ouverte par défaut.
 */
@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<PlatformPermission | undefined>(
      PLATFORM_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const user = context.switchToHttp().getRequest().user as { role?: string } | undefined;
    if (!permission || !hasPlatformPermission(user?.role, permission)) {
      throw new ForbiddenException(ERR.forbiddenPlatform);
    }
    return true;
  }
}
