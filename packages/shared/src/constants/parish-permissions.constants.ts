import { ParishDuty, ParishStatus } from '../enums/parish-status.enum';

/**
 * Permissions dans une paroisse, codées en dur (comme celles de la plateforme). Le code teste une
 * **permission** avec `hasParishPermission`, jamais un nom de statut ou de responsabilité.
 */
export type ParishPermission =
  /** Voir la paroisse dans son espace (tout fidèle). */
  | 'parish.view'
  /** Voir les annonces et activités « Paroissiens seulement ». */
  | 'parish.view.members'
  /** Lire séries, feuilles non publiées, modèles et contenus. */
  | 'parish.internal.read'
  /** Préparer et publier : séries, dates, feuilles, modèles, contenus ; notes internes. */
  | 'parish.celebrations.write'
  /** Rédiger les annonces et les activités. */
  | 'parish.announcements.write'
  /** Identité publique de la paroisse, membres, responsabilités. */
  | 'parish.manage';

export interface ParishMemberAccess {
  status: ParishStatus | `${ParishStatus}`;
  duties: readonly (ParishDuty | `${ParishDuty}`)[];
}

/** Permissions données par chaque responsabilité (celles du statut s'y ajoutent). */
export const PARISH_DUTY_PERMISSIONS: Record<ParishDuty, readonly ParishPermission[]> = {
  [ParishDuty.PREPARER]: ['parish.internal.read', 'parish.celebrations.write'],
  [ParishDuty.READER]: ['parish.internal.read'],
  [ParishDuty.ANNOUNCER]: ['parish.announcements.write'],
};

const FAITHFUL_PERMISSIONS: readonly ParishPermission[] = ['parish.view'];
const PARISHIONER_PERMISSIONS: readonly ParishPermission[] = [
  ...FAITHFUL_PERMISSIONS,
  'parish.view.members',
];
const ADMIN_PERMISSIONS: readonly ParishPermission[] = [
  ...PARISHIONER_PERMISSIONS,
  'parish.internal.read',
  'parish.celebrations.write',
  'parish.announcements.write',
  'parish.manage',
];

export function isParishDuty(value: unknown): value is ParishDuty {
  return typeof value === 'string' && (Object.values(ParishDuty) as string[]).includes(value);
}

export function parishPermissions(member: ParishMemberAccess): readonly ParishPermission[] {
  if (member.status === ParishStatus.PARISH_ADMIN) return ADMIN_PERMISSIONS;
  if (member.status === ParishStatus.FAITHFUL) return FAITHFUL_PERMISSIONS;
  // Les responsabilités n'existent que pour un paroissien : un fidèle n'en a jamais.
  const fromDuties = member.duties.flatMap((d) => PARISH_DUTY_PERMISSIONS[d as ParishDuty] ?? []);
  return [...new Set([...PARISHIONER_PERMISSIONS, ...fromDuties])];
}

export function hasParishPermission(member: ParishMemberAccess, perm: ParishPermission): boolean {
  return parishPermissions(member).includes(perm);
}

/** Un fidèle peut suivre au plus ce nombre de paroisses. */
export const MAX_FAITHFUL_PARISHES = 20;
