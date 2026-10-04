import { getTranslations } from 'next-intl/server';
import { staticPageMetadata } from '@/lib/seo.server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/link';
import { EmptyState } from '@/components/public/EmptyState';
import { ParishResultCard } from '@/components/public/ParishResultCard';
import { ParishSearchForm } from '@/components/public/ParishSearchForm';
import { publicApi } from '@/lib/api/public.api';

const WRAP = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';
const PAGE_SIZE = 12;

interface Props {
  searchParams: { q?: string; page?: string };
}

export const generateMetadata = (): Promise<Metadata> =>
  staticPageMetadata('/paroisses', 'parishes');

const pageLink = (q: string, page: number) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/paroisses?${qs}` : '/paroisses';
};

export default async function ParishSearchPage({ searchParams }: Props) {
  const t = await getTranslations('parishSearch');
  const q = (searchParams.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);
  const result = await publicApi.searchParishes(q || undefined, page, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className={`${WRAP} space-y-4 py-5 sm:space-y-6 sm:py-12`}>
      <h1 className="break-words font-playfair text-xl font-bold text-churchy-700 sm:text-3xl">
        {q ? t('resultsFor', { q }) : t('all')}
      </h1>
      <div className="max-w-3xl">
        <ParishSearchForm id="results-search" defaultValue={q} size="compact" />
      </div>

      <p className="text-sm text-churchy-900/75" aria-live="polite">
        {result.total === 0 ? t('none') : t('count', { count: result.total })}
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          hint={t('emptyHint')}
          action={q ? { href: '/paroisses', label: t('seeAll') } : undefined}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.items.map((p) => (
            <ParishResultCard key={p.id} parish={p} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label={t('pagination')} className="flex items-center justify-between gap-4 pt-2">
          {page > 1 ? (
            <Link
              href={pageLink(q, page - 1)}
              className="inline-flex h-11 items-center rounded-lg border border-churchy-200 bg-white px-5 text-sm font-medium text-churchy-700"
            >
              {t('previous')}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-churchy-900/75">{t('pageOf', { page, pages })}</span>
          {page < pages ? (
            <Link
              href={pageLink(q, page + 1)}
              className="inline-flex h-11 items-center rounded-lg border border-churchy-200 bg-white px-5 text-sm font-medium text-churchy-700"
            >
              {t('next')}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
