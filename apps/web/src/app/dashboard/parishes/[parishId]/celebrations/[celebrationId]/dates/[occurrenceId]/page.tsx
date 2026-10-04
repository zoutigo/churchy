'use client';
import { useTranslations } from 'next-intl';
import { useLabels } from '@/i18n/labels';
import { useAppLocale } from '@/i18n/locale';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/link';
import { useRouter } from '@/i18n/link';
import { ArrowLeft, StickyNote } from 'lucide-react';
import type { Content, OccurrenceDetail, SheetView } from '@churchy/shared';
import { celebrationsApi, templatesApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { contentsApi } from '@/lib/api/contents.api';
import { formatDateLong, formatTime } from '@/lib/format';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { OccurrenceForm } from '@/components/celebration/OccurrenceForm';
import { SheetCreator } from '@/components/celebration/SheetCreator';
import { SheetPanel } from '@/components/celebration/SheetPanel';
import { RichContent } from '@/components/rich-text/RichContent';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string; celebrationId: string; occurrenceId: string };
}

type Tab = 'sheet' | 'date';

/** Préparation d'une date : feuille (créée à la demande, modèle ou à la volée) et informations de la date. */
export default function OccurrencePage({ params }: Props) {
  const t = useTranslations('occurrencePage');
  const tc = useTranslations('common');
  const tp = useTranslations('celebrationPage');
  const td = useTranslations('dashboard');
  const labels = useLabels();
  const locale = useAppLocale();
  const { parishId, celebrationId, occurrenceId } = params;
  const router = useRouter();
  const [occurrence, setOccurrence] = useState<OccurrenceDetail | null>(null);
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('sheet');

  const load = useCallback(() => {
    celebrationsApi
      .getOccurrence(occurrenceId)
      .then((o) => {
        setOccurrence(o);
        setSheet(o.sheet);
      })
      .catch((err: unknown) => setError(errorMessage(err, td('loadError'))));
  }, [occurrenceId, td]);

  useEffect(load, [load]);
  useEffect(() => {
    templatesApi
      .findByParish(parishId)
      .then(setTemplates)
      .catch(() => undefined);
    contentsApi
      .findByParish(parishId)
      .then(setContents)
      .catch(() => undefined);
  }, [parishId]);

  if (error) return <ErrorNotice message={error} />;
  if (!occurrence) return <p className="text-muted-foreground">{tc('loadingShort')}</p>;

  const tz = { timeZone: occurrence.timezone, locale };
  const cancelled = occurrence.status === 'CANCELLED';
  const readOnly = occurrence.isPast || cancelled;
  const back = `/dashboard/parishes/${parishId}/celebrations/${celebrationId}`;
  const c = occurrence.celebration;

  async function toggleCancel() {
    try {
      if (cancelled) {
        await celebrationsApi.reinstateOccurrence(occurrenceId);
        notify.success(tp('reinstated'));
      } else {
        await celebrationsApi.cancelOccurrence(occurrenceId, {});
        notify.success(tp('cancelled'));
      }
      load();
    } catch (err) {
      notify.error(tp('updateError'), errorMessage(err, tp('updateError')));
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-3 h-10 gap-2 text-muted-foreground sm:h-9"
        >
          <Link href={back}>
            <ArrowLeft size={16} aria-hidden /> {c.title}
          </Link>
        </Button>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h1 className="font-playfair text-2xl font-bold text-churchy-700">
              {formatDateLong(occurrence.startsAt, tz)}
            </h1>
            <p className="text-muted-foreground">
              {t('line', {
                time: formatTime(occurrence.startsAt, tz),
                title: c.title,
                type: labels.celebrationType(c.type),
              })}
              {c.location ? t('location', { location: c.location }) : ''}
            </p>
          </div>
          {!occurrence.isPast && (
            <Button type="button" variant="outline" onClick={toggleCancel}>
              {cancelled ? t('reinstateDate') : t('cancelDate')}
            </Button>
          )}
        </div>
      </div>

      {occurrence.isPast && (
        <Alert>
          <AlertTitle>{t('pastTitle')}</AlertTitle>
          <AlertDescription>{t('pastText')}</AlertDescription>
        </Alert>
      )}
      {cancelled && (
        <Alert variant="destructive">
          <AlertTitle>{t('cancelledTitle')}</AlertTitle>
          <AlertDescription>
            {t('cancelledText', { reason: occurrence.cancelReason ?? t('noReason') })}
          </AlertDescription>
        </Alert>
      )}

      {(c.internalNote || occurrence.internalNote) && (
        <section
          className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4"
          data-testid="internal-notes"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <StickyNote size={14} aria-hidden /> {t('notesTitle')}
          </h2>
          {c.internalNote && (
            <p className="whitespace-pre-wrap text-sm text-amber-900">{c.internalNote}</p>
          )}
          {occurrence.internalNote && (
            <p className="whitespace-pre-wrap text-sm text-amber-900">
              <span className="font-semibold">{t('forThisDate')}</span>
              {occurrence.internalNote}
            </p>
          )}
        </section>
      )}

      {(c.description || occurrence.description) && (
        <section className="space-y-2 rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">{t('whatPublicSees')}</h2>
          {c.description && <RichContent html={c.description} />}
          {occurrence.description && <RichContent html={occurrence.description} />}
        </section>
      )}

      <div
        role="tablist"
        aria-label={t('tablist')}
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:inline-grid sm:grid-cols-2"
      >
        {(
          [
            ['sheet', t('tabSheet')],
            ['date', t('tabDate')],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-10 rounded-md px-4 text-sm font-medium transition-colors ${
              tab === id ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sheet' ? (
        <section aria-label={t('tabSheet')}>
          {sheet ? (
            <SheetPanel
              sheet={sheet}
              templates={templates}
              contents={contents}
              readOnly={readOnly}
              onChange={setSheet}
              onPublished={() => router.push(back)}
            />
          ) : readOnly ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              {t('noSheet')}
            </p>
          ) : (
            <SheetCreator
              occurrenceId={occurrenceId}
              templates={templates}
              defaultTemplate={c.defaultTemplate}
              onCreated={setSheet}
            />
          )}
        </section>
      ) : readOnly ? (
        <p className="text-muted-foreground">{t('locked')}</p>
      ) : (
        <OccurrenceForm occurrence={occurrence} onSaved={load} />
      )}
    </div>
  );
}
