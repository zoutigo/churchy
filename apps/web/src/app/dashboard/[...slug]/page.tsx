import { notFound } from 'next/navigation';

/** Toute adresse inconnue sous /dashboard : la page « introuvable » s'affiche DANS le tableau de bord (menu conservé). */
export default function DashboardUnknownPage() {
  notFound();
}
