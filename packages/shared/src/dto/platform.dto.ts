import type { UserRole } from '../enums/user-role.enum';

/** Compte tel que listé dans l'espace plateforme (jamais de secret, ni de téléphone en clair). */
export interface PlatformUserDto {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** Date de suspension, ou `null` si le compte est actif. */
  suspendedAt: string | null;
  createdAt: string;
}

export interface PlatformUsersPageDto {
  items: PlatformUserDto[];
  total: number;
  page: number;
  pageSize: number;
}

export const PLATFORM_USERS_PAGE_SIZE = 20;
