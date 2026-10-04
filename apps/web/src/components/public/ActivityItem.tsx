import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/i18n/locale';
import { MapPin } from 'lucide-react';
import type { PublicActivity } from '@churchy/shared';
import { RichContent } from '@/components/rich-text/RichContent';
import { formatDateParts, formatDateLong, formatTime } from '@/lib/format';

export function ActivityItem({ activity: a }: { activity: PublicActivity }) {
  const t = useTranslations('activity');
  const locale = useAppLocale();
  const tz = { locale };
  const d = formatDateParts(a.startsAt, tz);
  return (
    <article className="flex gap-4 overflow-hidden rounded-xl border border-churchy-100 bg-white p-4">
      <div
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-500 text-white"
        aria-hidden
      >
        <span className="text-xs">{d.weekday}</span>
        <span className="font-playfair text-2xl font-bold leading-none">{d.day}</span>
        <span className="text-xs">{d.month}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h2 className="font-playfair text-lg font-semibold text-churchy-700">{a.title}</h2>
        <p className="text-sm font-medium text-churchy-900">
          <time dateTime={a.startsAt}>
            {t('at', { date: formatDateLong(a.startsAt, tz), time: formatTime(a.startsAt, tz) })}
          </time>
        </p>
        {a.location && (
          <p className="flex items-center gap-1 text-sm text-churchy-900/70">
            <MapPin size={14} aria-hidden /> {a.location}
          </p>
        )}
        <RichContent html={a.description} className="text-churchy-900/85" />
        {a.imageUrl && (
          <img
            src={a.imageUrl}
            alt=""
            loading="lazy"
            className="mt-2 h-40 w-full rounded-lg object-cover"
          />
        )}
      </div>
    </article>
  );
}
