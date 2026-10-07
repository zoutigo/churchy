'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  hasParishPermission,
  UserRole,
  type ParishMembershipDto,
  type ParishPermission,
} from '@churchy/shared';
import { parishesApi } from '@/lib/api/parishes.api';
import { useAuth } from '@/hooks/useAuth';

/**
 * Ce que la personne connectée peut faire dans une paroisse. Le web ne fait que **proposer** ce qui est
 * permis (l'API impose les règles) : même règle que l'API, `hasParishPermission`. Le SUPER_ADMIN passe
 * partout, comme côté API ; un ADMIN/MODERATOR de plateforme lit sans écrire (lecture seule).
 */
export function useParishAccess(parishId: string) {
  const { user } = useAuth();
  const [membership, setMembership] = useState<ParishMembershipDto | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    parishesApi
      .membership(parishId)
      .then((m) => !cancelled && setMembership(m))
      .catch(() => !cancelled && setMembership(null))
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [parishId]);

  const can = useCallback(
    (permission: ParishPermission) => {
      if (user?.role === UserRole.SUPER_ADMIN) return true;
      const staffRead: ParishPermission[] = [
        'parish.view',
        'parish.view.members',
        'parish.internal.read',
      ];
      if (!membership?.status) {
        const staff = user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;
        return staff && staffRead.includes(permission);
      }
      return hasParishPermission(
        { status: membership.status, duties: membership.duties },
        permission,
      );
    },
    [membership, user?.role],
  );

  return { ready, membership, can };
}
