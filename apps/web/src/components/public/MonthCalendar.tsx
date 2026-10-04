import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/i18n/locale';
import { Link } from '@/i18n/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftMonth, utcToZoned, type Locale, type PublicCalendar } from '@churchy/shared';
import { buildMonthGrid, groupByDay } from '@/lib/calendar';
import { formatDateLong, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
  calendar: PublicCalendar;
  parishId: string;
  /** « AAAA-MM-JJ » d'aujourd'hui dans le fuseau de la paroisse (mis en évidence). */
  today: string;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;

const monthTitle = (month: string, locale: Locale) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/**
 * Calendrier public d'un mois. Desktop : grille semaine par semaine avec les messes dans chaque jour.
 * Mobile : liste des seuls jours qui ont une célébration (une grille de 7 colonnes y serait illisible).
 */
export function MonthCalendar({ calendar, parishId, today }: Props) {
  const t = useTranslations('calendar');
  const tc = useTranslations('celebration');
  const locale = useAppLocale();
  const { month, timezone, items } = calendar;
  const days = groupByDay(items, timezone);
  const base = `/paroisses/${parishId}/calendrier`;
  const tz = { timeZone: timezone, locale };

  const entry = (c: (typeof items)[number]) => (
    <Link
      key={c.id}
      href={`/paroisses/${parishId}/messes/${c.id}`}
      className={cn(
        'block rounded-md px-1.5 py-1 text-xs leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-churchy-500',
        c.cancelled
          ? 'bg-red-50 text-red-700 line-through hover:bg-red-100'
          : c.sheetStatus === 'AVAILABLE'
            ? 'bg-churchy-200 text-churchy-700 hover:bg-churchy-100'
            : 'bg-amber-400/20 text-amber-700 hover:bg-amber-400/30',
      )}
    >
      <span className="font-semibold">{formatTime(c.date, tz)}</span> {c.title}
      {c.cancelled && <span className="sr-only">{tc('cancelledSr')}</span>}
    </Link>
  );

  return (
    <section aria-labelledby="calendar-title" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`${base}?mois=${shiftMonth(month, -1)}`}
          aria-label={t('previous')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-churchy-200 bg-white text-churchy-700 hover:bg-churchy-100"
        >
          <ChevronLeft size={18} aria-hidden />
        </Link>
        <h2
          id="calendar-title"
          className="text-center font-playfair text-xl font-bold capitalize text-churchy-700 sm:text-2xl"
        >
          {monthTitle(month, locale)}
        </h2>
        <Link
          href={`${base}?mois=${shiftMonth(month, 1)}`}
          aria-label={t('next')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-churchy-200 bg-white text-churchy-700 hover:bg-churchy-100"
        >
          <ChevronRight size={18} aria-hidden />
        </Link>
      </div>

      {/* Mobile : jours avec célébration */}
      <div className="md:hidden" data-testid="calendar-list">
        {days.size === 0 ? (
          <p className="rounded-xl border border-dashed border-churchy-200 bg-white/60 p-6 text-center text-churchy-900/75">
            {t('empty')}
          </p>
        ) : (
          <ul className="space-y-3">
            {[...days.entries()].map(([day, list]) => (
              <li key={day} className="rounded-xl border border-churchy-100 bg-white p-3">
                <p
                  className={cn(
                    'mb-2 text-sm font-semibold capitalize text-churchy-700',
                    day === today && 'text-amber-600',
                  )}
                >
                  {formatDateLong(list[0].date, tz)}
                  {day === today && t('today')}
                </p>
                <div className="space-y-1.5">{list.map(entry)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tablette et desktop : grille */}
      <div
        className="hidden overflow-hidden rounded-xl border border-churchy-100 bg-white md:block"
        data-testid="calendar-grid"
      >
        <div className="grid grid-cols-7 border-b border-churchy-100 bg-churchy-100/50 text-center text-xs font-semibold uppercase text-churchy-700">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {t(`weekdays.${d}`)}
            </div>
          ))}
        </div>
        {buildMonthGrid(month).map((week, i) => (
          <div key={i} className="grid grid-cols-7 border-b border-churchy-100 last:border-b-0">
            {week.map((cell) => (
              <div
                key={cell.date}
                className={cn(
                  'min-h-24 space-y-1 border-r border-churchy-100 p-1.5 last:border-r-0',
                  !cell.inMonth && 'bg-churchy-100/30 text-churchy-900/40',
                )}
              >
                <p
                  className={cn(
                    'text-xs font-medium',
                    cell.date === today &&
                      'inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white',
                  )}
                >
                  {cell.day}
                </p>
                {cell.inMonth && (days.get(cell.date) ?? []).map(entry)}
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-churchy-900/70">
        {t.rich('legend', {
          green: (chunks) => <span className="font-medium text-churchy-700">{chunks}</span>,
          amber: (chunks) => <span className="font-medium text-amber-700">{chunks}</span>,
          red: (chunks) => <span className="font-medium text-red-700">{chunks}</span>,
        })}
      </p>
    </section>
  );
}

/** Jour local d'aujourd'hui dans le fuseau de la paroisse (utile à la page serveur). */
export const todayIn = (timezone: string, now = new Date()) => utcToZoned(now, timezone).date;
