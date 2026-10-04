'use client';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('extendSeries');
  const tf = useTranslations('celebrationForm');
  const tc = useTranslations('common');
  const [draft, setDraft] = useState<ScheduleDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const preview = previewDraft(draft, celebration.timezone);
    if (preview.blank || !preview.schedule || preview.error || preview.instants.length === 0) {
      setError(preview.error ?? tf('atLeastOneDate'));
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
      notify.success(t('extended'), added > 0 ? t('added', { count: added }) : t('alreadyExisted'));
      onDone(updated);
    } catch (err) {
      const message = errorMessage(err, t('error'));
      setError(message);
      notify.error(t('error'), message);
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
          {busy ? t('adding') : t('submit')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc('cancel')}
        </Button>
      </div>
    </form>
  );
}
