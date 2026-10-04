import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/public/EmptyState';
import { ActivityItem } from '@/components/public/ActivityItem';
import { orNotFound, publicApi } from '@/lib/api/public.api';

interface Props {
  params: { parishId: string };
}

export default async function Page({ params }: Props) {
  const t = await getTranslations('parishActivities');
  const items = await orNotFound(publicApi.getActivities(params.parishId));

  return (
    <section aria-labelledby="page-title" className="space-y-4">
      <h2 id="page-title" className="font-playfair text-2xl font-bold text-churchy-700">
        {t('title')}
      </h2>
      {items.length === 0 ? (
        <EmptyState title={t('empty')} hint={t('emptyHint')} />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <ActivityItem key={a.id} activity={a} />
          ))}
        </div>
      )}
    </section>
  );
}
