'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

/** Barre de navigation de la page d'accueil : s'adapte à l'état de connexion. */
export function SiteHeader() {
  const { user, initializing } = useAuth();

  return (
    <header className="absolute inset-x-0 top-0 z-10">
      <nav
        aria-label="Navigation principale"
        className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between"
      >
        <Link href="/" className="flex items-center gap-2">
          <span className="text-churchy-300">✦</span>
          <span className="font-playfair text-lg font-bold tracking-widest uppercase text-white">
            Churchy
          </span>
        </Link>

        {/* Réserve la place pendant la vérification de session pour éviter un clignotement */}
        <div className="flex items-center gap-3 min-h-9" data-testid="site-nav-actions">
          {initializing ? null : user ? (
            <Link
              href="/dashboard"
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Mon espace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-churchy-100 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
