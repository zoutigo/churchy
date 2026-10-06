'use client';
import { useEffect } from 'react';
import { hasPlatformPermission } from '@churchy/shared';
import { useRouter } from '@/i18n/link';
import { useAuth } from '@/hooks/useAuth';

/**
 * Filet côté client : l'API refuse déjà toute route de plateforme sans la permission. Un compte sans rôle de
 * plateforme (ou à qui on vient de le retirer) est renvoyé à son espace, rien n'est rendu entre-temps.
 * À placer sous `AuthGuard` (l'utilisateur est alors connu).
 */
export function PlatformGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = !!user && hasPlatformPermission(user.role, 'platform.access');

  useEffect(() => {
    if (user && !allowed) router.replace('/dashboard');
  }, [user, allowed, router]);

  return allowed ? <>{children}</> : null;
}
