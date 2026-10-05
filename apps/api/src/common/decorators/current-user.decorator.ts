import type { UserWithAuth } from '../../modules/auth/auth-user';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Utilisateur authentifié : l'entité renvoyée par JwtStrategy.validate */
export type AuthUser = UserWithAuth;

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
