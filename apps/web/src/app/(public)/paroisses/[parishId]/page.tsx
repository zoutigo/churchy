import Link from 'next/link';
import { ActivityItem } from '@/components/public/ActivityItem';
import { AnnouncementItem } from '@/components/public/AnnouncementItem';
import { CelebrationItem } from '@/components/public/CelebrationItem';
import { EmptyState } from '@/components/public/EmptyState';
import { ParishInfoPanel } from '@/components/public/ParishInfoPanel';
import { orNotFound, publicApi } from '@/lib/api/public.api';

interface Props {
  params: { parishId: string };
}

function Section({
  id,
  title,
  href,
  linkLabel,
  children,
}: {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="font-playfair text-2xl font-bold text-churchy-700">
          {title}
        </h2>
        <Link
          href={href}
          className="text-sm font-medium text-churchy-500 underline-offset-2 hover:underline"
        >
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function ParishHomePage({ params }: Props) {
  const { parishId } = params;
  const [parish, celebrations, announcements, activities] = await orNotFound(
    Promise.all([
      publicApi.getParish(parishId),
      publicApi.getCelebrations(parishId),
      publicApi.getAnnouncements(parishId),
      publicApi.getActivities(parishId),
    ]),
  );
  const base = `/paroisses/${parishId}`;

  return (
    <>
      {parish.description && (
        <section aria-labelledby="presentation" className="space-y-2">
          <h2 id="presentation" className="font-playfair text-2xl font-bold text-churchy-700">
            Présentation
          </h2>
          <p className="max-w-prose whitespace-pre-wrap leading-relaxed text-churchy-900/85">
            {parish.description}
          </p>
        </section>
      )}

      {/* Sur desktop, la fiche pratique est dans la colonne de droite. */}
      <div className="lg:hidden">
        <ParishInfoPanel parish={parish} />
      </div>

      <Section
        id="next-masses"
        title="Prochaines messes"
        href={`${base}/messes`}
        linkLabel="Toutes les messes"
      >
        {celebrations.length === 0 ? (
          <EmptyState
            title="Aucune messe annoncée pour l’instant"
            hint="Revenez bientôt : la paroisse publie ses célébrations ici."
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {celebrations.slice(0, 3).map((c) => (
              <CelebrationItem key={c.id} celebration={c} parishId={parishId} />
            ))}
          </div>
        )}
      </Section>

      <Section
        id="latest-announcements"
        title="Annonces"
        href={`${base}/annonces`}
        linkLabel="Toutes les annonces"
      >
        {announcements.length === 0 ? (
          <EmptyState title="Aucune annonce pour l’instant" />
        ) : (
          <div className="space-y-4">
            {announcements.slice(0, 2).map((a) => (
              <AnnouncementItem key={a.id} announcement={a} />
            ))}
          </div>
        )}
      </Section>

      <Section
        id="next-activities"
        title="Activités"
        href={`${base}/activites`}
        linkLabel="Toutes les activités"
      >
        {activities.length === 0 ? (
          <EmptyState title="Aucune activité à venir" />
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 3).map((a) => (
              <ActivityItem key={a.id} activity={a} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
