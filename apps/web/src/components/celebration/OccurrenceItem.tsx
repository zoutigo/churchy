'use client';
import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/i18n/locale';
import { useState } from 'react';
import { Link } from '@/i18n/link';
import type { OccurrenceView } from '@churchy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateLong, formatDateParts, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
  occurrence: OccurrenceView;
  href: string;
  timezone: string;
  onCancel: (reason: string) => Promise<void>;
  onReinstate: () => Promise<void>;
}

const badge = 'rounded-full border px-2 py-0.5 text-xs font-medium';

function SheetBadge({ sheet }: { sheet: OccurrenceView['sheet'] }) {
  const t = useTranslations('occurrenceItem');
  if (!sheet)
    return (
      <span className={`${badge} border-gray-200 bg-gray-100 text-gray-600`}>{t('noSheet')}</span>
    );
  if (sheet.status === 'PUBLISHED') {
    return (
      <span className={`${badge} border-churchy-300 bg-churchy-200 text-churchy-700`}>
        {t('sheetPublished')}
      </span>
    );
  }
  return (
    <span className={`${badge} border-amber-300 bg-amber-50 text-amber-800`}>
      {t('draftProgress', { filled: sheet.filledCount, total: sheet.stepCount })}
    </span>
  );
}

/** Une date d'une série : bloc-date, état, note, et actions (préparer, annuler / rétablir). */
export function OccurrenceItem({ occurrence: o, href, timezone, onCancel, onReinstate }: Props) {
  const t = useTranslations('occurrenceItem');
  const tz = { timeZone: timezone, locale: useAppLocale() };
  const d = formatDateParts(o.startsAt, tz);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const cancelled = o.status === 'CANCELLED';

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setAsking(false);
      setReason('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-white p-3 sm:p-4 md:flex-row md:items-center',
        (cancelled || o.isPast) && 'bg-gray-50',
      )}
      data-testid="occurrence-item"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg text-white',
            cancelled || o.isPast ? 'bg-gray-400' : 'bg-churchy-700',
          )}
          aria-hidden
        >
          <span className="text-[11px] leading-none">{d.weekday}</span>
          <span className="font-playfair text-xl font-bold leading-tight">{d.day}</span>
          <span className="text-[11px] leading-none">{d.month}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn('font-medium', cancelled && 'line-through')}>
            {t('at', { date: formatDateLong(o.startsAt, tz), time: formatTime(o.startsAt, tz) })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cancelled ? (
              <span className={`${badge} border-destructive/40 bg-destructive/5 text-destructive`}>
                {o.cancelReason
                  ? t('cancelledWithReason', { reason: o.cancelReason })
                  : t('cancelled')}
              </span>
            ) : (
              <SheetBadge sheet={o.sheet} />
            )}
            {o.isPast && (
              <span className={`${badge} border-gray-200 bg-gray-100 text-gray-600`}>
                {t('past')}
              </span>
            )}
          </div>
          {o.internalNote && (
            <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
              <span className="font-semibold">{t('internalNote')}</span> {o.internalNote}
            </p>
          )}
        </div>
      </div>

      {asking ? (
        <div className="flex flex-col gap-2 sm:flex-row md:w-96">
          <Input
            aria-label={t('reasonLabel')}
            placeholder={t('reasonPlaceholder')}
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => run(() => onCancel(reason))}
            >
              {t('confirmCancel')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
              {t('back')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 md:shrink-0">
          <Button
            asChild
            size="sm"
            variant={o.isPast ? 'outline' : 'default'}
            className="flex-1 md:flex-none"
          >
            <Link href={href}>
              {o.isPast
                ? t('consult')
                : cancelled
                  ? t('details')
                  : o.sheet
                    ? t('prepare')
                    : t('prepareSheet')}
            </Link>
          </Button>
          {!o.isPast &&
            (cancelled ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                className="flex-1 md:flex-none"
                onClick={() => run(onReinstate)}
              >
                {t('reinstate')}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 md:flex-none"
                onClick={() => setAsking(true)}
              >
                {t('cancelDate')}
              </Button>
            ))}
        </div>
      )}
    </li>
  );
}
