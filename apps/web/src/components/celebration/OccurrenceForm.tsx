'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  INTERNAL_NOTE_MAX_LENGTH,
  utcToZoned,
  type OccurrenceDetail,
  type OccurrenceView,
} from '@churchy/shared';
import { celebrationsApi } from '@/lib/api/celebrations.api';
import { dateBounds } from '@/lib/schedule-draft';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/rich-text/RichTextEditor';

interface Props {
  occurrence: OccurrenceDetail;
  onSaved: (occurrence: OccurrenceView) => void;
}

/** Ce qui est propre à cette date : horaire, précision publique, note interne. */
export function OccurrenceForm({ occurrence, onSaved }: Props) {
  const t = useTranslations('occurrenceForm');
  const ts = useTranslations('schedule');
  const tc = useTranslations('common');
  const local = utcToZoned(new Date(occurrence.startsAt), occurrence.timezone);
  const bounds = dateBounds(occurrence.timezone);
  const [date, setDate] = useState(local.date);
  const [time, setTime] = useState(local.time);
  const [description, setDescription] = useState(occurrence.description ?? '');
  const [note, setNote] = useState(occurrence.internalNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const moved = date !== local.date || time !== local.time;
    try {
      const saved = await celebrationsApi.updateOccurrence(occurrence.id, {
        ...(moved && { start: { date, time } }),
        description,
        internalNote: note,
      });
      notify.success(t('saved'), moved ? t('timeChanged') : undefined);
      onSaved(saved);
    } catch (err) {
      const message = errorMessage(err, t('saveError'));
      setError(message);
      notify.error(t('saveError'), message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="occurrence-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="occ-date">{ts('date')}</Label>
          <Input
            id="occ-date"
            type="date"
            min={bounds.min}
            max={bounds.max}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="occ-time">{ts('time')}</Label>
          <Input id="occ-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t('publicNote')}</Label>
        <RichTextEditor
          minHeight="8rem"
          aria-label={t('publicNoteAria')}
          value={description}
          onChange={setDescription}
        />
        <p className="text-xs text-muted-foreground">{t('publicNoteHint')}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="occ-note">{t('internalNote')}</Label>
        <Textarea
          id="occ-note"
          rows={3}
          maxLength={INTERNAL_NOTE_MAX_LENGTH}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('internalNotePlaceholder')}
        />
        <p className="text-xs text-muted-foreground">{t('internalNoteHint')}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? t('saving') : tc('save')}
      </Button>
    </form>
  );
}
