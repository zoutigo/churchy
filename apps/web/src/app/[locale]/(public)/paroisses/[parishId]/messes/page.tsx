import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/link';
import { EmptyState } from '@/components/public/EmptyState';
import { CelebrationItem } from '@/components/public/CelebrationItem';
import { orNotFound, publicApi } from '@/lib/api/public.api';

interface Props {
  params: { parishId: string };
}

export default async function Page({ params }: Props) {
  const t = await getTranslations('parishMasses');
  const items = await orNotFound(publicApi.getCelebrations(params.parishId));

  return (
    <section aria-labelledby="page-title" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="page-title" className="font-playfair text-2xl font-bold text-churchy-700">
          {t('title')}
        </h2>
        <Link
          href={`/paroisses/${params.parishId}/calendrier`}
          className="text-sm font-medium text-churchy-500 underline underline-offset-2"
        >
          {t('calendar')}
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState title={t('empty')} hint={t('emptyHint')} />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((c) => (
            <CelebrationItem key={c.id} celebration={c} parishId={params.parishId} />
          ))}
        </div>
      )}
    </section>
  );
}
