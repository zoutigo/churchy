'use client';
import { useState } from 'react';
import { Link } from '@/i18n/link';
import { Menu, Star, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { useAuth } from '@/hooks/useAuth';

const linkClass =
  'rounded-md px-3 py-2 text-sm font-medium text-churchy-700 hover:bg-churchy-100 transition-colors';
const ctaClass =
  'rounded-lg bg-churchy-500 px-4 py-2 text-sm font-semibold text-white hover:bg-churchy-700 transition-colors text-center';

/**
 * En-tête léger des pages publiques. Mobile : logo + bouton de menu (panneau déroulant) ;
 * à partir de `md` : liens en ligne.
 *
 * `hasSession` (lu côté serveur dans le cookie indicateur) permet d'afficher Connexion dès le
 * rendu serveur à un visiteur sans session, sans attendre le JavaScript : sans cookie, il est forcément anonyme.
 * Non fourni (page d'erreur) : on attend la fin de la vérification de session.
 */
export function PublicHeader({ hasSession }: { hasSession?: boolean }) {
  const t = useTranslations('nav');
  const { user, initializing } = useAuth();
  const { ids, ready } = useFavorites();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const sessionKnown = !initializing || hasSession === false;

  const links = (
    <>
      <Link href="/pour-les-paroisses" className={linkClass} onClick={close}>
        {t('forParishes')}
      </Link>
      <Link
        href="/favoris"
        className={`${linkClass} inline-flex items-center gap-1.5`}
        onClick={close}
      >
        <Star size={15} className="text-amber-500" aria-hidden />
        {t('favorites')}
        {ready && ids.length > 0 && (
          <span
            className="rounded-full bg-churchy-700 px-1.5 text-xs font-semibold leading-5 text-white"
            aria-label={t('favoritesCount', { count: ids.length })}
          >
            {ids.length}
          </span>
        )}
      </Link>
      {!sessionKnown ? null : user ? (
        <Link href="/dashboard" className={ctaClass} onClick={close}>
          {t('mySpace')}
        </Link>
      ) : (
        <>
          {/* Connexion seule : l'inscription s'atteint depuis la page de connexion (« S'inscrire »). */}
          <Link href="/login" className={ctaClass} onClick={close}>
            {t('login')}
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-churchy-100 bg-churchy-50/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label={t('home')}>
          <span className="text-amber-500" aria-hidden>
            ✦
          </span>
          <span className="font-playfair text-xl font-bold tracking-wide text-churchy-700">
            Churchy
          </span>
        </Link>

        <nav aria-label={t('main')} className="hidden items-center gap-1 md:flex">
          {links}
          <LanguageSwitcher className="ml-2" />
        </nav>

        {/* Mobile : le choix de langue reste visible, sans ouvrir le menu. */}
        <LanguageSwitcher className="ml-auto mr-2 md:hidden" />
        <button
          type="button"
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-churchy-700 hover:bg-churchy-100 md:hidden"
          aria-label={open ? t('closeMenu') : t('openMenu')}
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
          aria-label={t('mobile')}
          className="flex flex-col gap-1 border-t border-churchy-100 px-4 py-3 md:hidden"
        >
          {links}
        </nav>
      )}
    </header>
  );
}
