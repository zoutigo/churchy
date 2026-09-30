'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

/** Boutons d'appel à l'action de la page d'accueil, selon que l'utilisateur est connecté ou non. */
export function HeroActions() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="flex gap-4 justify-center flex-wrap">
        <Link
          href="/dashboard"
          className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
        >
          Accéder à mon espace
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-4 justify-center flex-wrap">
      <Link
        href="/register"
        className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
      >
        Commencer gratuitement
      </Link>
      <Link
        href="/login"
        className="border border-churchy-200 text-churchy-100 hover:bg-churchy-500 px-8 py-3 rounded-lg font-semibold transition-colors"
      >
        Se connecter
      </Link>
    </div>
  );
}
