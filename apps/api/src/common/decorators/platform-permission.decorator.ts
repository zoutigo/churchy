import { SetMetadata } from '@nestjs/common';
import type { PlatformPermission } from '@churchy/shared';

export const PLATFORM_PERMISSION_KEY = 'platformPermission';

/** Permission de plateforme exigée (voir `PlatformPermissionGuard`). */
export const RequirePlatformPermission = (permission: PlatformPermission) =>
  SetMetadata(PLATFORM_PERMISSION_KEY, permission);
