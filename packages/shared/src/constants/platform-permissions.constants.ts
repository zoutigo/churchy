import { UserRole } from '../enums/user-role.enum';

/**
 * Rôles de plateforme (rôle du compte, pas rôle dans une paroisse), du plus élevé au plus bas.
 * Rôles fixes : les permissions sont codées en dur ici, le code les teste avec `hasPlatformPermission`.
 */
export const PLATFORM_ROLE_RANK: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 3,
  [UserRole.ADMIN]: 2,
  [UserRole.MODERATOR]: 1,
  [UserRole.USER]: 0,
};

export type PlatformPermission =
  /** Entrer dans l'espace plateforme (toggle, `/platform`). */
  | 'platform.access'
  | 'platform.users.read'
  | 'platform.roles.manage'
  | 'platform.users.suspend'
  | 'platform.pin-reset'
  | 'platform.contact.read'
  | 'platform.content.moderate'
  /** Lire (jamais écrire) les données internes de n'importe quelle paroisse. */
  | 'platform.parishes.read';

const ALL: PlatformPermission[] = [
  'platform.access',
  'platform.users.read',
  'platform.roles.manage',
  'platform.users.suspend',
  'platform.pin-reset',
  'platform.contact.read',
  'platform.content.moderate',
  'platform.parishes.read',
];

export const PLATFORM_PERMISSIONS: Record<UserRole, readonly PlatformPermission[]> = {
  [UserRole.SUPER_ADMIN]: ALL,
  [UserRole.ADMIN]: ALL,
  [UserRole.MODERATOR]: [
    'platform.access',
    'platform.contact.read',
    'platform.content.moderate',
    'platform.parishes.read',
  ],
  [UserRole.USER]: [],
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && value in PLATFORM_ROLE_RANK;
}

/** Vrai pour tout rôle autre que `USER`. */
export function isPlatformRole(role: unknown): boolean {
  return isUserRole(role) && role !== UserRole.USER;
}

export function hasPlatformPermission(role: unknown, permission: PlatformPermission): boolean {
  return isUserRole(role) && PLATFORM_PERMISSIONS[role].includes(permission);
}

/**
 * Changer le rôle de plateforme d'un compte.
 * - SUPER_ADMIN : tous les rôles, sur tous les comptes (le « dernier SUPER_ADMIN » est vérifié par le service) ;
 * - ADMIN : seulement MODERATOR ↔ USER, sur des comptes MODERATOR ou USER (jamais un ADMIN ni un SUPER_ADMIN) ;
 * - les autres : rien.
 */
export function canChangePlatformRole(actor: UserRole, target: UserRole, next: UserRole): boolean {
  if (!hasPlatformPermission(actor, 'platform.roles.manage')) return false;
  if (actor === UserRole.SUPER_ADMIN) return true;
  const manageable = (r: UserRole) => r === UserRole.MODERATOR || r === UserRole.USER;
  return manageable(target) && manageable(next);
}

/**
 * Suspendre ou rétablir un compte.
 * - SUPER_ADMIN : tous les comptes sauf le sien ;
 * - ADMIN : MODERATOR et USER ;
 * - MODERATOR et USER : personne.
 */
export function canSuspendAccount(actor: UserRole, target: UserRole, isSelf: boolean): boolean {
  if (isSelf || !hasPlatformPermission(actor, 'platform.users.suspend')) return false;
  if (actor === UserRole.SUPER_ADMIN) return true;
  return target === UserRole.MODERATOR || target === UserRole.USER;
}
