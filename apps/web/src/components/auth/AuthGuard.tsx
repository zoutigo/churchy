'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Filet de sécurité côté client : le middleware écarte déjà ceux qui n'ont aucune session, mais
 * la session peut expirer pendant la navigation. Rien de privé n'est rendu tant que l'utilisateur
 * n'est pas confirmé par l'API.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initializing, sessionExpired, loggedOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initializing || user) return;
    // Déconnexion volontaire : simple retour à la connexion, sans page de retour.
    if (loggedOut) {
      router.replace('/login');
      return;
    }
    const params = new URLSearchParams();
    if (sessionExpired) params.set('expired', '1');
    params.set('next', pathname);
    router.replace(`/login?${params.toString()}`);
  }, [initializing, user, sessionExpired, loggedOut, pathname, router]);

  if (initializing || !user) {
    return (
      <div
        role="status"
        aria-label="Chargement"
        className="min-h-screen flex items-center justify-center bg-churchy-50"
      >
        <Loader2 className="animate-spin text-churchy-500" size={24} />
      </div>
    );
  }

  return <>{children}</>;
}
