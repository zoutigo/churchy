import { useTranslations } from 'next-intl';
import { useLabels } from '@/i18n/labels';
import { useAppLocale } from '@/i18n/locale';
import { Link } from '@/i18n/link';
import { CalendarClock, Repeat } from 'lucide-react';
import type { CelebrationListItem } from '@churchy/shared';
import { formatDateLong, formatTime } from '@/lib/format';

/** Vue d'administration d'une série. La vue publique est `CelebrationItem` (components/public). */
interface Props {
  celebration: CelebrationListItem;
  parishId: string;
  timezone: string;
}

const badge = 'rounded-full px-2 py-0.5 text-xs font-medium';

export function CelebrationCard({ celebration: c, parishId, timezone }: Props) {
  const t = useTranslations('celebrationCard');
  const labels = useLabels();
  const tz = { timeZone: timezone, locale: useAppLocale() };
  const href = `/dashboard/parishes/${parishId}/celebrations/${c.id}`;

  return (
    <Link href={href} className="group block" data-testid="celebration-card">
      <div className="flex overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
        <div className="w-1 shrink-0 bg-churchy-500 transition-colors group-hover:bg-amber-500" />
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate font-playfair font-semibold text-churchy-700 transition-colors group-hover:text-churchy-500">
              {c.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {labels.celebrationType(c.type)}
              {c.location ? ` — ${c.location}` : ''}
            </p>
            {c.nextOccurrence ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <CalendarClock size={14} aria-hidden />
                <span>
                  {t('next', {
                    date: formatDateLong(c.nextOccurrence.startsAt, tz),
                    time: formatTime(c.nextOccurrence.startsAt, tz),
                  })}
                  {c.nextOccurrence.status === 'CANCELLED' && t('cancelledSuffix')}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noUpcoming')}</p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Repeat size={12} aria-hidden />
              {t('dates', { count: c.occurrenceCount })}
              {c.upcomingCount !== c.occurrenceCount &&
                t('ofWhichUpcoming', { upcoming: c.upcomingCount })}
              {c.defaultTemplate && t('template', { name: c.defaultTemplate.name })}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:max-w-[40%] sm:flex-col sm:items-end">
            {c.archivedAt ? (
              <span className={`${badge} border border-gray-200 bg-gray-100 text-gray-500`}>
                {t('archived')}
              </span>
            ) : c.announced ? (
              <span
                className={`${badge} border border-churchy-300 bg-churchy-200 text-churchy-700`}
              >
                {t('published')}
              </span>
            ) : (
              <span
                className={`${badge} border border-churchy-200 bg-churchy-100 text-churchy-700`}
              >
                {t('draft')}
              </span>
            )}
            {c.endingSoon && (
              <span className={`${badge} bg-amber-400/20 text-amber-700`}>{t('endingSoon')}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
