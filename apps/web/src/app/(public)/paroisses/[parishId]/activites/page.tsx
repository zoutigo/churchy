import { EmptyState } from '@/components/public/EmptyState';
import { ActivityItem } from '@/components/public/ActivityItem';
import { orNotFound, publicApi } from '@/lib/api/public.api';

interface Props {
  params: { parishId: string };
}

export default async function Page({ params }: Props) {
  const items = await orNotFound(publicApi.getActivities(params.parishId));

  return (
    <section aria-labelledby="page-title" className="space-y-4">
      <h2 id="page-title" className="font-playfair text-2xl font-bold text-churchy-700">
        Activités à venir
      </h2>
      {items.length === 0 ? (
        <EmptyState
          title="Aucune activité à venir"
          hint="Les rencontres et événements de la paroisse apparaîtront ici."
        />
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
