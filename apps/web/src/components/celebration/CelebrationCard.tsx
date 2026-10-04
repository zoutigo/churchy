import Link from 'next/link';
import { CalendarClock, Repeat } from 'lucide-react';
import type { CelebrationListItem } from '@churchy/shared';
import { CELEBRATION_TYPE_LABELS, formatDateLong, formatTime } from '@/lib/format';

/** Vue d'administration d'une série. La vue publique est `CelebrationItem` (components/public). */
interface Props {
  celebration: CelebrationListItem;
  parishId: string;
  timezone: string;
}

const badge = 'rounded-full px-2 py-0.5 text-xs font-medium';

export function CelebrationCard({ celebration: c, parishId, timezone }: Props) {
  const tz = { timeZone: timezone };
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
              {CELEBRATION_TYPE_LABELS[c.type]}
              {c.location ? ` — ${c.location}` : ''}
            </p>
            {c.nextOccurrence ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <CalendarClock size={14} aria-hidden />
                <span>
                  Prochaine : {formatDateLong(c.nextOccurrence.startsAt, tz)} à{' '}
                  {formatTime(c.nextOccurrence.startsAt, tz)}
                  {c.nextOccurrence.status === 'CANCELLED' && ' (annulée)'}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune date à venir</p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Repeat size={12} aria-hidden />
              {c.occurrenceCount} date{c.occurrenceCount > 1 ? 's' : ''}
              {c.upcomingCount !== c.occurrenceCount && ` dont ${c.upcomingCount} à venir`}
              {c.defaultTemplate && ` — modèle « ${c.defaultTemplate.name} »`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:max-w-[40%] sm:flex-col sm:items-end">
            {c.archivedAt ? (
              <span className={`${badge} border border-gray-200 bg-gray-100 text-gray-500`}>
                Archivée
              </span>
            ) : c.announced ? (
              <span
                className={`${badge} border border-churchy-300 bg-churchy-200 text-churchy-700`}
              >
                Publiée au public
              </span>
            ) : (
              <span
                className={`${badge} border border-churchy-200 bg-churchy-100 text-churchy-700`}
              >
                Brouillon
              </span>
            )}
            {c.endingSoon && (
              <span className={`${badge} bg-amber-400/20 text-amber-700`}>Se termine bientôt</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
