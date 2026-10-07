import { notFound } from 'next/navigation';

/** Toute adresse inconnue sous /platform : la page « introuvable » s'affiche DANS l'espace plateforme (menu conservé). */
export default function PlatformUnknownPage() {
  notFound();
}
