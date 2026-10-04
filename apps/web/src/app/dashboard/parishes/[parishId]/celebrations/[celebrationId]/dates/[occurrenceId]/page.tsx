'use client';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/link';
import { useRouter } from '@/i18n/link';
import { ArrowLeft, StickyNote } from 'lucide-react';
import type { Content, OccurrenceDetail, SheetView } from '@churchy/shared';
import { celebrationsApi, templatesApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { contentsApi } from '@/lib/api/contents.api';
import { CELEBRATION_TYPE_LABELS, formatDateLong, formatTime } from '@/lib/format';
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
      .catch((err: unknown) => setError(errorMessage(err, 'Impossible de charger les données')));
  }, [occurrenceId]);

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
  if (!occurrence) return <p className="text-muted-foreground">Chargement…</p>;

  const tz = { timeZone: occurrence.timezone };
  const cancelled = occurrence.status === 'CANCELLED';
  const readOnly = occurrence.isPast || cancelled;
  const back = `/dashboard/parishes/${parishId}/celebrations/${celebrationId}`;
  const c = occurrence.celebration;

  async function toggleCancel() {
    try {
      if (cancelled) {
        await celebrationsApi.reinstateOccurrence(occurrenceId);
        notify.success('Date rétablie');
      } else {
        await celebrationsApi.cancelOccurrence(occurrenceId, {});
        notify.success('Date annulée');
      }
      load();
    } catch (err) {
      notify.error(
        'Erreur lors de la modification',
        errorMessage(err, 'Erreur lors de la modification'),
      );
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
              {formatTime(occurrence.startsAt, tz)} — {c.title} · {CELEBRATION_TYPE_LABELS[c.type]}
              {c.location ? ` · ${c.location}` : ''}
            </p>
          </div>
          {!occurrence.isPast && (
            <Button type="button" variant="outline" onClick={toggleCancel}>
              {cancelled ? 'Rétablir cette date' : 'Annuler cette date'}
            </Button>
          )}
        </div>
      </div>

      {occurrence.isPast && (
        <Alert>
          <AlertTitle>Date passée</AlertTitle>
          <AlertDescription>Elle se consulte, mais ne peut plus être modifiée.</AlertDescription>
        </Alert>
      )}
      {cancelled && (
        <Alert variant="destructive">
          <AlertTitle>Date annulée</AlertTitle>
          <AlertDescription>
            {occurrence.cancelReason ?? 'Aucun motif indiqué.'} Elle reste affichée comme annulée
            sur le site public.
          </AlertDescription>
        </Alert>
      )}

      {(c.internalNote || occurrence.internalNote) && (
        <section
          className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4"
          data-testid="internal-notes"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <StickyNote size={14} aria-hidden /> À savoir avant de préparer — note interne
          </h2>
          {c.internalNote && (
            <p className="whitespace-pre-wrap text-sm text-amber-900">{c.internalNote}</p>
          )}
          {occurrence.internalNote && (
            <p className="whitespace-pre-wrap text-sm text-amber-900">
              <span className="font-semibold">Pour cette date : </span>
              {occurrence.internalNote}
            </p>
          )}
        </section>
      )}

      {(c.description || occurrence.description) && (
        <section className="space-y-2 rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Ce que voit le public</h2>
          {c.description && <RichContent html={c.description} />}
          {occurrence.description && <RichContent html={occurrence.description} />}
        </section>
      )}

      <div
        role="tablist"
        aria-label="Préparation"
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:inline-grid sm:grid-cols-2"
      >
        {(
          [
            ['sheet', 'Feuille de préparation'],
            ['date', 'Informations de la date'],
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
        <section aria-label="Feuille de préparation">
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
              Aucune feuille n’a été préparée pour cette date.
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
        <p className="text-muted-foreground">Cette date ne peut plus être modifiée.</p>
      ) : (
        <OccurrenceForm occurrence={occurrence} onSaved={load} />
      )}
    </div>
  );
}
