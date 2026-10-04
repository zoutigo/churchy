import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/link';
import { ActivityItem } from '@/components/public/ActivityItem';
import { AnnouncementItem } from '@/components/public/AnnouncementItem';
import { CelebrationItem } from '@/components/public/CelebrationItem';
import { EmptyState } from '@/components/public/EmptyState';
import { ParishInfoPanel } from '@/components/public/ParishInfoPanel';
import { orNotFound, publicApi } from '@/lib/api/public.api';

/** Sur mobile, l'accueil n'affiche que les 2 premiers éléments de chaque bloc (le lien « Tout voir » donne la suite). */
const MOBILE_COUNT = 2;

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
  const t = await getTranslations('parishHome');
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
            {t('presentation')}
          </h2>
          <p className="max-w-prose whitespace-pre-wrap leading-relaxed text-churchy-900/85">
            {parish.description}
          </p>
        </section>
      )}

      <Section
        id="next-masses"
        title={t('nextMasses')}
        href={`${base}/messes`}
        linkLabel={t('allMasses')}
      >
        {celebrations.length === 0 ? (
          <EmptyState title={t('noMass')} hint={t('noMassHint')} />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {celebrations.slice(0, 3).map((c, i) => (
              <div key={c.id} className={i >= MOBILE_COUNT ? 'hidden sm:block' : undefined}>
                <CelebrationItem celebration={c} parishId={parishId} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        id="latest-announcements"
        title={t('announcements')}
        href={`${base}/annonces`}
        linkLabel={t('allAnnouncements')}
      >
        {announcements.length === 0 ? (
          <EmptyState title={t('noAnnouncement')} />
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
        title={t('activities')}
        href={`${base}/activites`}
        linkLabel={t('allActivities')}
      >
        {activities.length === 0 ? (
          <EmptyState title={t('noActivity')} />
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 3).map((a, i) => (
              <div key={a.id} className={i >= MOBILE_COUNT ? 'hidden sm:block' : undefined}>
                <ActivityItem activity={a} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Sur mobile, la fiche pratique passe en dernier ; sur desktop elle est dans la colonne de droite. */}
      <div className="lg:hidden">
        <ParishInfoPanel parish={parish} />
      </div>
    </>
  );
}
