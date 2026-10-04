import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicHeader } from '@/components/public/PublicHeader';

/** Cadre commun du site hors tableau de bord : en-tête (logo cliquable → accueil), contenu, pied de page. */
export function PublicShell({
  children,
  hasSession,
}: {
  children: React.ReactNode;
  /** Présence du cookie de session, lue par le layout serveur (voir `PublicHeader`). */
  hasSession?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-churchy-50">
      <PublicHeader hasSession={hasSession} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
