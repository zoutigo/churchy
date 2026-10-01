import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/public/EmptyState';
import { ParishResultCard } from '@/components/public/ParishResultCard';
import { ParishSearchForm } from '@/components/public/ParishSearchForm';
import { publicApi } from '@/lib/api/public.api';

const WRAP = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';
const PAGE_SIZE = 12;

interface Props {
  searchParams: { q?: string; page?: string };
}

export const metadata: Metadata = { title: 'Trouver une paroisse — Churchy' };

const pageLink = (q: string, page: number) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/paroisses?${qs}` : '/paroisses';
};

export default async function ParishSearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);
  const result = await publicApi.searchParishes(q || undefined, page, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className={`${WRAP} space-y-6 py-8 sm:py-12`}>
      <h1 className="font-playfair text-3xl font-bold text-churchy-700">
        {q ? `Résultats pour « ${q} »` : 'Toutes les paroisses'}
      </h1>
      <div className="max-w-3xl">
        <ParishSearchForm id="results-search" defaultValue={q} size="compact" />
      </div>

      <p className="text-sm text-churchy-900/75" aria-live="polite">
        {result.total === 0
          ? 'Aucune paroisse trouvée'
          : `${result.total} paroisse${result.total > 1 ? 's' : ''}`}
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          title="Aucune paroisse ne correspond à votre recherche"
          hint="Vérifiez l’orthographe, ou essayez avec le nom d’une ville ou d’un quartier."
          action={q ? { href: '/paroisses', label: 'Voir toutes les paroisses' } : undefined}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.items.map((p) => (
            <ParishResultCard key={p.id} parish={p} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-2">
          {page > 1 ? (
            <Link
              href={pageLink(q, page - 1)}
              className="inline-flex h-11 items-center rounded-lg border border-churchy-200 bg-white px-5 text-sm font-medium text-churchy-700"
            >
              Page précédente
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-churchy-900/75">
            Page {page} sur {pages}
          </span>
          {page < pages ? (
            <Link
              href={pageLink(q, page + 1)}
              className="inline-flex h-11 items-center rounded-lg border border-churchy-200 bg-white px-5 text-sm font-medium text-churchy-700"
            >
              Page suivante
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
