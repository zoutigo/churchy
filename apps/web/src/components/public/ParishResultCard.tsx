import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/i18n/locale';
import { Link } from '@/i18n/link';
import { Church, ExternalLink, MapPin } from 'lucide-react';
import type { PublicParishSummary } from '@churchy/shared';
import { formatDateShort, formatTime, placeLabel } from '@/lib/format';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { SheetStatusBadge } from './SheetStatusBadge';

/**
 * `newTab` : depuis le tableau de bord, le site public de la paroisse s'ouvre dans un nouvel onglet
 * pour ne pas faire quitter l'espace connecté.
 */
export function ParishResultCard({
  parish,
  newTab = false,
}: {
  parish: PublicParishSummary;
  newTab?: boolean;
}) {
  const t = useTranslations('parishResult');
  const locale = useAppLocale();
  const next = parish.nextCelebration;
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-churchy-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h2 className="font-playfair text-xl font-semibold text-churchy-700">{parish.name}</h2>
        <p className="flex items-center gap-1.5 text-sm text-churchy-900/80">
          <MapPin size={15} className="shrink-0 text-amber-500" aria-hidden />
          {placeLabel(parish)}
        </p>
        {parish.mainChurch && (
          <p className="flex items-center gap-1.5 text-sm text-churchy-900/80">
            <Church size={15} className="shrink-0 text-amber-500" aria-hidden />
            {parish.mainChurch}
          </p>
        )}
        {next && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-churchy-900">
            <span>
              {t('nextMass', {
                date: formatDateShort(next.date, { timeZone: next.timezone, locale }),
                time: formatTime(next.date, { timeZone: next.timezone, locale }),
              })}
            </span>
            <SheetStatusBadge status={next.sheetStatus} />
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <FavoriteButton parishId={parish.id} parishName={parish.name} variant="icon" />
        <Link
          href={`/paroisses/${parish.id}`}
          aria-label={
            newTab
              ? `${t('viewLabel', { name: parish.name })} ${t('newTab')}`
              : t('viewLabel', { name: parish.name })
          }
          {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-churchy-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-churchy-700 sm:flex-none"
        >
          {t('view')}
          {newTab && <ExternalLink size={14} className="ml-2 shrink-0" aria-hidden />}
        </Link>
      </div>
    </article>
  );
}
