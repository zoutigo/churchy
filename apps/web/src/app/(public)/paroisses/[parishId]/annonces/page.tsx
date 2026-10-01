import { EmptyState } from '@/components/public/EmptyState';
import { AnnouncementItem } from '@/components/public/AnnouncementItem';
import { orNotFound, publicApi } from '@/lib/api/public.api';

interface Props {
  params: { parishId: string };
}

export default async function Page({ params }: Props) {
  const items = await orNotFound(publicApi.getAnnouncements(params.parishId));

  return (
    <section aria-labelledby="page-title" className="space-y-4">
      <h2 id="page-title" className="font-playfair text-2xl font-bold text-churchy-700">
        Annonces
      </h2>
      {items.length === 0 ? (
        <EmptyState
          title="Aucune annonce pour l’instant"
          hint="Les informations importantes de la paroisse apparaîtront ici."
        />
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <AnnouncementItem key={a.id} announcement={a} />
          ))}
        </div>
      )}
    </section>
  );
}
