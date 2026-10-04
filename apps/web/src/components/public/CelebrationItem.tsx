import { Link } from '@/i18n/link';
import { MapPin } from 'lucide-react';
import type { PublicCelebrationSummary } from '@churchy/shared';
import { useLocale, useTranslations } from 'next-intl';
import { formatDateParts, formatTime } from '@/lib/format';
import { useLabels } from '@/i18n/labels';
import { isLocale } from '@/i18n/routing';
import { SheetStatusBadge } from './SheetStatusBadge';

interface Props {
  celebration: PublicCelebrationSummary;
  parishId: string;
}

/** Une messe dans une liste : bloc-date, intitulé, heure, lieu, état de la feuille. */
export function CelebrationItem({ celebration: c, parishId }: Props) {
  const t = useTranslations('celebration');
  const labels = useLabels();
  const raw = useLocale();
  const tz = { timeZone: c.timezone, locale: isLocale(raw) ? raw : undefined };
  const d = formatDateParts(c.date, tz);
  return (
    <Link
      href={`/paroisses/${parishId}/messes/${c.id}`}
      className={`group flex gap-4 rounded-xl border border-churchy-100 bg-white p-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-churchy-500 ${c.cancelled ? 'opacity-75' : ''}`}
    >
      <div
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-churchy-700 text-white"
        aria-hidden
      >
        <span className="text-xs">{d.weekday}</span>
        <span className="font-playfair text-2xl font-bold leading-none">{d.day}</span>
        <span className="text-xs">{d.month}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h3
          className={`font-playfair text-lg font-semibold text-churchy-700 group-hover:text-churchy-500 ${
            c.cancelled ? 'line-through' : ''
          }`}
        >
          {c.title}
        </h3>
        <p className="text-sm text-churchy-900/80">
          <time dateTime={c.date}>{formatTime(c.date, tz)}</time>
          {' — '}
          {labels.celebrationType(c.type)}
        </p>
        {c.location && (
          <p className="flex items-center gap-1 text-sm text-churchy-900/70">
            <MapPin size={14} aria-hidden /> {c.location}
          </p>
        )}
        <div className="pt-1">
          {c.cancelled ? (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
              {c.cancelReason
                ? t('cancelledWithReason', { reason: c.cancelReason })
                : t('cancelled')}
            </span>
          ) : (
            <SheetStatusBadge status={c.sheetStatus} />
          )}
        </div>
      </div>
    </Link>
  );
}
