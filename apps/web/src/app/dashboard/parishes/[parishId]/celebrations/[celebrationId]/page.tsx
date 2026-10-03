'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, StickyNote } from 'lucide-react';
import type { CelebrationDetail } from '@churchy/shared';
import { celebrationsApi } from '@/lib/api/celebrations.api';
import { CELEBRATION_TYPE_LABELS, formatDateLong } from '@/lib/format';
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
      .catch((err: unknown) => setError(errorMessage(err, 'Impossible de charger les données')));
  }, [celebrationId]);

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
  if (!celebration) return <p className="text-muted-foreground">Chargement…</p>;

  const done = (c: CelebrationDetail) => {
    setCelebration(c);
    setView('overview');
  };

  if (view === 'edit') {
    return (
      <FormView title="Modifier la célébration" onBack={() => setView('overview')}>
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
        title="Prolonger la série"
        description={`Ajouter des dates à « ${celebration.title} »`}
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

  const tz = { timeZone: celebration.timezone };
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
            <ArrowLeft size={16} aria-hidden /> Retour
          </Link>
        </Button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="font-playfair text-2xl font-bold text-churchy-700">
              {celebration.title}
            </h1>
            <p className="text-muted-foreground">
              {CELEBRATION_TYPE_LABELS[celebration.type]}
              {celebration.location ? ` — ${celebration.location}` : ''}
            </p>
            <p className="text-sm" data-testid="series-status">
              {archived ? (
                <span className="font-medium text-gray-500">Archivée — retirée du site public</span>
              ) : celebration.announced ? (
                <span className="font-medium text-churchy-600">
                  Publiée au public (toutes les dates)
                </span>
              ) : (
                <span className="font-medium text-amber-700">Brouillon — invisible du public</span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            <Button type="button" variant="outline" onClick={() => setView('edit')}>
              Modifier
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={archived}
              onClick={() => setView('extend')}
            >
              Prolonger
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
                    celebration.announced
                      ? 'Série retirée du site public'
                      : 'Série publiée au public',
                    'Erreur lors de la modification',
                  )
                }
              >
                {celebration.announced ? 'Retirer du public' : 'Publier au public'}
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
                  archived ? 'Série désarchivée' : 'Série archivée',
                  'Erreur lors de l’archivage',
                )
              }
            >
              {archived ? 'Désarchiver' : 'Archiver'}
            </Button>
          </div>
        </div>
      </div>

      {celebration.endingSoon && !archived && (
        <Alert variant="warning">
          <AlertTitle>Cette série se termine bientôt</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Dernière date : {formatDateLong(celebration.lastOccurrenceAt!, tz)}. Prolongez-la pour
              que les fidèles voient les prochaines messes.
            </p>
            <Button type="button" size="sm" onClick={() => setView('extend')}>
              Prolonger la série
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {(celebration.description || celebration.internalNote) && (
        <div className="grid gap-4 md:grid-cols-2">
          {celebration.description && (
            <section className="rounded-lg border bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                Description publique
              </h2>
              <RichContent html={celebration.description} />
            </section>
          )}
          {celebration.internalNote && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <StickyNote size={14} aria-hidden /> Note interne — réservée à l’équipe
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
          Dates à venir ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            Aucune date à venir. Prolongez la série pour en ajouter.
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
                    'Date annulée',
                    'Erreur lors de l’annulation',
                  )
                }
                onReinstate={() =>
                  onDate(
                    () => celebrationsApi.reinstateOccurrence(o.id),
                    'Date rétablie',
                    'Erreur lors du rétablissement',
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
            Dates passées ({past.length}) — consultation seule
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
