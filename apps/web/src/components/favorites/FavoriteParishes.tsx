'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
import { Star } from 'lucide-react';
import { MAX_FAVORITE_PARISHES } from '@churchy/shared';
import { ParishResultCard } from '@/components/public/ParishResultCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { useFavoriteItems } from './FavoritesProvider';

/** Cartes des paroisses favorites (au plus `MAX_FAVORITE_PARISHES`), pendant le chargement un squelette. */
function FavoriteCards({ columns, newTab = false }: { columns: string; newTab?: boolean }) {
  const t = useTranslations('favorites');
  const { items, ids, itemsLoading } = useFavoriteItems();
  if (itemsLoading && items.length === 0) {
    return (
      <div className={`grid gap-4 ${columns}`} aria-busy="true" aria-label={t('loading')}>
        {ids.slice(0, 3).map((id) => (
          <div
            key={id}
            className="h-32 animate-pulse rounded-xl border border-churchy-100 bg-white"
          />
        ))}
      </div>
    );
  }
  return (
    <div className={`grid gap-4 ${columns}`}>
      {items.map((p) => (
        <ParishResultCard key={p.id} parish={p} newTab={newTab} />
      ))}
    </div>
  );
}

/**
 * Landing : raccourci vers les paroisses favorites, pour ne plus passer par la recherche.
 * N'affiche rien tant qu'il n'y a pas de favori.
 */
export function FavoritesShelf() {
  const t = useTranslations('favorites');
  const { ids, ready } = useFavoriteItems();
  if (!ready || ids.length === 0) return null;
  return (
    <section
      className="border-b border-churchy-100 bg-white"
      aria-labelledby="favorites-shelf-title"
      data-testid="favorites-shelf"
    >
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="favorites-shelf-title"
            className="flex items-center gap-2 font-playfair text-2xl font-bold text-churchy-700"
          >
            <Star className="fill-amber-500 text-amber-500" size={22} aria-hidden />
            {ids.length === 1 ? t('shelfOne') : t('shelfMany')}
          </h2>
          <Link
            href="/favoris"
            className="shrink-0 text-sm font-semibold text-churchy-500 hover:text-churchy-700"
          >
            {t('link')}
          </Link>
        </div>
        <FavoriteCards columns="lg:grid-cols-2" />
      </div>
    </section>
  );
}

/** Page « Mes favoris ». */
export function FavoritesPage() {
  const t = useTranslations('favorites');
  const { ids, ready } = useFavoriteItems();
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="space-y-2">
        <h1 className="font-playfair text-3xl font-bold text-churchy-700">{t('title')}</h1>
        <p className="text-sm text-churchy-900/75">
          {t('intro')}{' '}
          {ready && ids.length > 0 && (
            <span>{t('count', { count: ids.length, max: MAX_FAVORITE_PARISHES })}</span>
          )}
        </p>
      </div>
      {!ready ? null : ids.length === 0 ? (
        <div className="rounded-xl border border-dashed border-churchy-200 bg-white p-8 text-center">
          <Star className="mx-auto text-amber-500" size={28} aria-hidden />
          <p className="mt-3 font-playfair text-lg font-semibold text-churchy-700">
            {t('emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-churchy-900/75">{t('emptyHint')}</p>
          <Link
            href="/paroisses"
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-churchy-500 px-5 text-sm font-semibold text-white hover:bg-churchy-700"
          >
            {t('find')}
          </Link>
        </div>
      ) : (
        <FavoriteCards columns="lg:grid-cols-2" />
      )}
    </div>
  );
}

/** « Mes favoris » dans le tableau de bord : même liste, mais on reste dans l'espace connecté (barre latérale / mobile). */
export function DashboardFavorites() {
  const t = useTranslations('favorites');
  const { ids, ready } = useFavoriteItems();
  return (
    <div className="space-y-6" data-testid="dashboard-favorites">
      <PageHeader
        title={t('title')}
        description={
          ready && ids.length > 0
            ? `${t('intro')} ${t('count', { count: ids.length, max: MAX_FAVORITE_PARISHES })}`
            : t('intro')
        }
      />
      {!ready ? null : ids.length === 0 ? (
        <div className="rounded-xl border border-dashed border-churchy-200 bg-white p-8 text-center">
          <Star className="mx-auto text-amber-500" size={28} aria-hidden />
          <p className="mt-3 font-playfair text-lg font-semibold text-churchy-700">
            {t('emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-churchy-900/75">{t('emptyHint')}</p>
          <Link
            href="/paroisses"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-churchy-500 px-5 text-sm font-semibold text-white hover:bg-churchy-700"
          >
            {t('find')}
          </Link>
        </div>
      ) : (
        <FavoriteCards columns="xl:grid-cols-2" newTab />
      )}
    </div>
  );
}
