import { serverHasSession } from '@/lib/auth/session.server';
import { PublicShell } from '@/components/layout/PublicShell';

// Les pages publiques lisent l'API à chaque requête : jamais de copie périmée (annonce supprimée…).
export const dynamic = 'force-dynamic';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell hasSession={serverHasSession()}>{children}</PublicShell>;
}
