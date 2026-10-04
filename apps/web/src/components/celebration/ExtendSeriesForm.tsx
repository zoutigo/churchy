'use client';
import { useState } from 'react';
import type { CelebrationDetail } from '@churchy/shared';
import { celebrationsApi } from '@/lib/api/celebrations.api';
import { emptyDraft, previewDraft, type ScheduleDraft } from '@/lib/schedule-draft';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { ScheduleFields } from './ScheduleFields';

interface Props {
  celebration: CelebrationDetail;
  onDone: (celebration: CelebrationDetail) => void;
  onCancel: () => void;
}

/** Prolonge une série : de nouvelles dates s'ajoutent, celles qui existent déjà sont ignorées. */
export function ExtendSeriesForm({ celebration, onDone, onCancel }: Props) {
  const [draft, setDraft] = useState<ScheduleDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const preview = previewDraft(draft, celebration.timezone);
    if (preview.blank || !preview.schedule || preview.error || preview.instants.length === 0) {
      setError(preview.error ?? 'Indiquez au moins une date');
      return;
    }
    setBusy(true);
    setError(null);
    const before = celebration.occurrences.length;
    try {
      const updated = await celebrationsApi.addOccurrences(celebration.id, {
        schedule: preview.schedule,
      });
      const added = updated.occurrences.length - before;
      notify.success(
        'Série prolongée',
        added > 0
          ? `${added} date${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}`
          : 'Ces dates existaient déjà',
      );
      onDone(updated);
    } catch (err) {
      const message = errorMessage(err, 'Erreur lors de la prolongation');
      setError(message);
      notify.error('Erreur lors de la prolongation', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <ScheduleFields
        value={draft}
        onChange={(v) => {
          setDraft(v);
          setError(null);
        }}
        timezone={celebration.timezone}
        invalid={!!error}
      />
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={busy}>
          {busy ? 'Ajout…' : 'Ajouter ces dates'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
