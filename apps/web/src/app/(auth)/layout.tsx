import { PublicShell } from '@/components/layout/PublicShell';

/** Connexion, inscription… : le même cadre que le site public (en-tête avec logo cliquable, pied de page). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
