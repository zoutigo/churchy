'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const linkClass =
  'rounded-md px-3 py-2 text-sm font-medium text-churchy-700 hover:bg-churchy-100 transition-colors';
const ctaClass =
  'rounded-lg bg-churchy-500 px-4 py-2 text-sm font-semibold text-white hover:bg-churchy-700 transition-colors text-center';

/**
 * En-tête léger des pages publiques. Mobile : logo + bouton de menu (panneau déroulant) ;
 * à partir de `md` : liens en ligne.
 */
export function PublicHeader() {
  const { user, initializing } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const links = (
    <>
      <Link href="/pour-les-paroisses" className={linkClass} onClick={close}>
        Pour les paroisses
      </Link>
      {initializing ? null : user ? (
        <Link href="/dashboard" className={ctaClass} onClick={close}>
          Mon espace
        </Link>
      ) : (
        <>
          <Link href="/login" className={linkClass} onClick={close}>
            Connexion
          </Link>
          <Link href="/register" className={ctaClass} onClick={close}>
            Créer un compte
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-churchy-100 bg-churchy-50/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Churchy, accueil">
          <span className="text-amber-500" aria-hidden>
            ✦
          </span>
          <span className="font-playfair text-xl font-bold tracking-wide text-churchy-700">
            Churchy
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {links}
        </nav>

        <button
          type="button"
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-churchy-700 hover:bg-churchy-100 md:hidden"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="public-mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav
          id="public-mobile-menu"
          aria-label="Menu mobile"
          className="flex flex-col gap-1 border-t border-churchy-100 px-4 py-3 md:hidden"
        >
          {links}
        </nav>
      )}
    </header>
  );
}
