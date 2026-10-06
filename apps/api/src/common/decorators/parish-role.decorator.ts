import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ParishMemberAccess } from '@churchy/shared';

/**
 * Accès de l'appelant à la paroisse de la route (posé par `ParishRolesGuard`) : son statut et ses
 * responsabilités, ou `SUPER_ADMIN` / `PLATFORM_STAFF` (ADMIN ou MODERATOR de plateforme, lecture seule).
 */
export type ParishRoleValue = ParishMemberAccess | 'SUPER_ADMIN' | 'PLATFORM_STAFF';

export const CurrentParishRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ParishRoleValue | undefined =>
    ctx.switchToHttp().getRequest().parishRole,
);
