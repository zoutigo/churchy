import { applyDecorators, SetMetadata } from '@nestjs/common';
import type { ParishPermission } from '@churchy/shared';

export const PARISH_PERMISSION_KEY = 'parishPermission';
export const PARISH_SCOPE_KEY = 'parishScope';

/** Ressource dont le paramètre d'URL permet de retrouver la paroisse concernée. */
export type ParishScopeKind =
  'parish' | 'template' | 'templateStep' | 'content' | 'celebration' | 'occurrence' | 'sheet';

export interface ParishScopeOptions {
  kind: ParishScopeKind;
  /** Nom du paramètre d'URL portant l'identifiant (par défaut : parishId, sinon id). */
  param?: string;
}

/**
 * Restreint une route aux membres de la paroisse qui ont la **permission** donnée (voir
 * `parish-permissions.constants.ts`). `kind` indique comment retrouver la paroisse : directement
 * (`parishId` dans l'URL) ou via la ressource ciblée (célébration, modèle, contenu…), pour qu'un
 * identifiant d'une autre paroisse ne puisse pas contourner le contrôle.
 */
export const ParishAccess = (
  permission: ParishPermission,
  kind: ParishScopeKind = 'parish',
  param?: string,
) =>
  applyDecorators(
    SetMetadata(PARISH_PERMISSION_KEY, permission),
    SetMetadata(PARISH_SCOPE_KEY, { kind, param } satisfies ParishScopeOptions),
  );
