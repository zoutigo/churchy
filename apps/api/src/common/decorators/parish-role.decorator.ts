import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ParishRole } from '@churchy/shared';

/** Rôle du membre dans la paroisse de la route (posé par `ParishRolesGuard`), ou `SUPER_ADMIN`. */
export type ParishRoleValue = ParishRole | 'SUPER_ADMIN';

export const CurrentParishRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ParishRoleValue | undefined =>
    ctx.switchToHttp().getRequest().parishRole,
);
