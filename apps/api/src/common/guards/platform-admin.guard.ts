import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ERR } from '@churchy/shared';

/**
 * Réservé aux administrateurs de la plateforme (rôle du compte, pas rôle dans une paroisse).
 * À placer après `JwtAuthGuard`. Les rôles de plateforme seront étendus au prochain chantier : ce garde
 * est le seul endroit à adapter.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as { role?: string } | undefined;
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException(ERR.forbiddenPlatform);
    return true;
  }
}
