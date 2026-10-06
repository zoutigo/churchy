import { hasParishPermission } from '@churchy/shared';
import type { ParishRoleValue } from './decorators/parish-role.decorator';

/** Voir les annonces et activités « Paroissiens seulement » : paroissien et plus, équipe de plateforme comprise. */
export function canSeeMembersContent(role: ParishRoleValue | undefined): boolean {
  if (role === undefined) return false;
  if (role === 'SUPER_ADMIN' || role === 'PLATFORM_STAFF') return true;
  return hasParishPermission(role, 'parish.view.members');
}
