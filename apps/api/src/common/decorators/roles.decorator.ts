import { SetMetadata } from '@nestjs/common';
import { ParishRole } from '@churchy/shared';

export const PARISH_ROLES_KEY = 'parishRoles';
export const ParishRoles = (...roles: ParishRole[]) =>
  SetMetadata(PARISH_ROLES_KEY, roles);
