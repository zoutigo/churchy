import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ParishRole } from '@churchy/shared';

export const PARISH_ROLES_KEY = 'parishRoles';
export const PARISH_SCOPE_KEY = 'parishScope';

/** Ressource dont le paramètre d'URL permet de retrouver la paroisse concernée. */
export type ParishScopeKind = 'parish' | 'template' | 'templateStep' | 'content' | 'celebration';

export interface ParishScopeOptions {
  kind: ParishScopeKind;
  /** Nom du paramètre d'URL portant l'identifiant (par défaut : parishId, sinon id). */
  param?: string;
}

/** Tous les membres d'une paroisse : lecture. */
export const ALL_MEMBERS = [
  ParishRole.PARISH_ADMIN,
  ParishRole.PREPARER,
  ParishRole.READER,
  ParishRole.VIEWER,
];
/** Ceux qui préparent et publient les célébrations : écriture. */
export const EDITORS = [ParishRole.PARISH_ADMIN, ParishRole.PREPARER];
/** Gestion de la paroisse (membres, etc.). */
export const ADMINS = [ParishRole.PARISH_ADMIN];

export const ParishRoles = (...roles: ParishRole[]) => SetMetadata(PARISH_ROLES_KEY, roles);

/**
 * Restreint une route aux membres de la paroisse ayant l'un des rôles donnés.
 * `kind` indique comment retrouver la paroisse : directement (`parishId` dans l'URL) ou via la
 * ressource ciblée (célébration, modèle, contenu…), pour qu'un identifiant d'une autre paroisse
 * ne puisse pas contourner le contrôle.
 */
export const ParishAccess = (
  roles: ParishRole[],
  kind: ParishScopeKind = 'parish',
  param?: string,
) =>
  applyDecorators(
    ParishRoles(...roles),
    SetMetadata(PARISH_SCOPE_KEY, { kind, param } satisfies ParishScopeOptions),
  );
