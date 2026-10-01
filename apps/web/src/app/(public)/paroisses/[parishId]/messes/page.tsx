import { EmptyState } from '@/components/public/EmptyState';
import { CelebrationItem } from '@/components/public/CelebrationItem';
import { orNotFound, publicApi } from '@/lib/api/public.api';

interface Props {
  params: { parishId: string };
}

export default async function Page({ params }: Props) {
  const items = await orNotFound(publicApi.getCelebrations(params.parishId));

  return (
    <section aria-labelledby="page-title" className="space-y-4">
      <h2 id="page-title" className="font-playfair text-2xl font-bold text-churchy-700">
        Messes à venir
      </h2>
      {items.length === 0 ? (
        <EmptyState
          title="Aucune messe annoncée pour l’instant"
          hint="La paroisse n’a pas encore publié ses prochaines célébrations."
        />
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
