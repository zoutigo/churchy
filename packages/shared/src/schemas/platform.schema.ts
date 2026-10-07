import { z } from 'zod';
import { UserRole } from '../enums/user-role.enum';

export const updatePlatformRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const platformUsersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type UpdatePlatformRoleDto = z.infer<typeof updatePlatformRoleSchema>;
export type PlatformUsersQuery = z.infer<typeof platformUsersQuerySchema>;
