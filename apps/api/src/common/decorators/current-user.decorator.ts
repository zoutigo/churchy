import type { User } from '@prisma/client';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Utilisateur authentifié : l'entité renvoyée par JwtStrategy.validate */
export type AuthUser = User;

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
