'use client';
import { useTranslations } from 'next-intl';
import { useLabels } from '@/i18n/labels';
import { useAppLocale } from '@/i18n/locale';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, StickyNote } from 'lucide-react';
import type { CelebrationDetail } from '@churchy/shared';
import { celebrationsApi } from '@/lib/api/celebrations.api';
import { formatDateLong } from '@/lib/format';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { CelebrationForm } from '@/components/celebration/CelebrationForm';
import { ExtendSeriesForm } from '@/components/celebration/ExtendSeriesForm';
import { OccurrenceItem } from '@/components/celebration/OccurrenceItem';
import { FormView } from '@/components/layout/FormView';
import { RichContent } from '@/components/rich-text/RichContent';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string; celebrationId: string };
}

type View = 'overview' | 'edit' | 'extend';

export default function CelebrationPage({ params }: Props) {
  const t = useTranslations('celebrationPage');
  const td = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tf = useTranslations('celebrationForm');
  const te = useTranslations('endingSoon');
  const labels = useLabels();
  const locale = useAppLocale();
  const { parishId, celebrationId } = params;
  const search = useSearchParams();
  const [celebration, setCelebration] = useState<CelebrationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(search.get('prolonger') ? 'extend' : 'overview');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    celebrationsApi
      .findById(celebrationId)
      .then(setCelebration)
      .catch((err: unknown) => setError(errorMessage(err, td('loadError'))));
  }, [celebrationId, td]);

  useEffect(load, [load]);

  const base = `/dashboard/parishes/${parishId}/celebrations`;

  async function act(action: () => Promise<CelebrationDetail>, success: string, failure: string) {
    setBusy(true);
    try {
      setCelebration(await action());
      notify.success(success);
    } catch (err) {
      notify.error(failure, errorMessage(err, failure));
    } finally {
      setBusy(false);
    }
  }

  /** Action sur une date : toast, puis rechargement de la série. */
  async function onDate(action: () => Promise<unknown>, success: string, failure: string) {
    try {
      await action();
      notify.success(success);
      load();
    } catch (err) {
      notify.error(failure, errorMessage(err, failure));
    }
  }

  if (error) return <ErrorNotice message={error} />;
  if (!celebration) return <p className="text-muted-foreground">{tc('loadingShort')}</p>;

  const done = (c: CelebrationDetail) => {
    setCelebration(c);
    setView('overview');
  };

  if (view === 'edit') {
    return (
      <FormView title={t('editTitle')} onBack={() => setView('overview')}>
        <CelebrationForm
          parishId={parishId}
          timezone={celebration.timezone}
          celebration={celebration}
          onDone={done}
          onCancel={() => setView('overview')}
        />
      </FormView>
    );
  }
  if (view === 'extend') {
    return (
      <FormView
        title={t('extendTitle')}
        description={t('extendDesc', { title: celebration.title })}
        onBack={() => setView('overview')}
      >
        <ExtendSeriesForm
          celebration={celebration}
          onDone={done}
          onCancel={() => setView('overview')}
        />
      </FormView>
    );
  }

  const tz = { timeZone: celebration.timezone, locale };
  const upcoming = celebration.occurrences.filter((o) => !o.isPast);
  const past = celebration.occurrences.filter((o) => o.isPast).reverse();
  const archived = !!celebration.archivedAt;
  const datesHref = (occurrenceId: string) => `${base}/${celebration.id}/dates/${occurrenceId}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-3 h-10 gap-2 text-muted-foreground sm:h-9"
        >
          <Link href={base}>
            <ArrowLeft size={16} aria-hidden /> {tc('back')}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="font-playfair text-2xl font-bold text-churchy-700">
              {celebration.title}
            </h1>
            <p className="text-muted-foreground">
              {labels.celebrationType(celebration.type)}
              {celebration.location ? ` — ${celebration.location}` : ''}
            </p>
            <p className="text-sm" data-testid="series-status">
              {archived ? (
                <span className="font-medium text-gray-500">{t('archivedStatus')}</span>
              ) : celebration.announced ? (
                <span className="font-medium text-churchy-600">{t('publishedStatus')}</span>
              ) : (
                <span className="font-medium text-amber-700">{t('draftStatus')}</span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            <Button type="button" variant="outline" onClick={() => setView('edit')}>
              {tc('edit')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={archived}
              onClick={() => setView('extend')}
            >
              {t('extend')}
            </Button>
            {!archived && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  act(
                    () =>
                      celebrationsApi.update(celebration.id, { announced: !celebration.announced }),
                    celebration.announced ? t('unannounced') : t('announced'),
                    t('updateError'),
                  )
                }
              >
                {celebration.announced ? t('withdraw') : t('publishToPublic')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                act(
                  () =>
                    archived
                      ? celebrationsApi.unarchive(celebration.id)
                      : celebrationsApi.archive(celebration.id),
                  archived ? t('unarchived') : t('archivedToast'),
                  t('archiveError'),
                )
              }
            >
              {archived ? t('unarchive') : t('archive')}
            </Button>
          </div>
        </div>
      </div>

      {celebration.endingSoon && !archived && (
        <Alert variant="warning">
          <AlertTitle>{t('endingTitle')}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{t('endingText', { date: formatDateLong(celebration.lastOccurrenceAt!, tz) })}</p>
            <Button type="button" size="sm" onClick={() => setView('extend')}>
              {te('extend')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {(celebration.description || celebration.internalNote) && (
        <div className="grid gap-4 md:grid-cols-2">
          {celebration.description && (
            <section className="rounded-lg border bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                {tf('publicDescription')}
              </h2>
              <RichContent html={celebration.description} />
            </section>
          )}
          {celebration.internalNote && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <StickyNote size={14} aria-hidden /> {t('internalNoteTitle')}
              </h2>
              <p className="whitespace-pre-wrap text-sm text-amber-900">
                {celebration.internalNote}
              </p>
            </section>
          )}
        </div>
      )}

      <section className="space-y-3" aria-labelledby="dates-title">
        <h2 id="dates-title" className="text-lg font-semibold">
          {t('upcomingDates', { count: upcoming.length })}
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            {t('noUpcoming')}
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((o) => (
              <OccurrenceItem
                key={o.id}
                occurrence={o}
                href={datesHref(o.id)}
                timezone={celebration.timezone}
                onCancel={(reason) =>
                  onDate(
                    () => celebrationsApi.cancelOccurrence(o.id, { reason }),
                    t('cancelled'),
                    t('cancelError'),
                  )
                }
                onReinstate={() =>
                  onDate(
                    () => celebrationsApi.reinstateOccurrence(o.id),
                    t('reinstated'),
                    t('reinstateError'),
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {t('pastDates', { count: past.length })}
          </summary>
          <ul className="mt-3 space-y-2">
            {past.map((o) => (
              <OccurrenceItem
                key={o.id}
                occurrence={o}
                href={datesHref(o.id)}
                timezone={celebration.timezone}
                onCancel={async () => undefined}
                onReinstate={async () => undefined}
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
