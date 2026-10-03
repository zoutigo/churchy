'use client';
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
      notify.success('Date enregistrée', moved ? 'Horaire modifié' : undefined);
      onSaved(saved);
    } catch (err) {
      const message = errorMessage(err, 'Erreur lors de l’enregistrement');
      setError(message);
      notify.error('Erreur lors de l’enregistrement', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="occurrence-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="occ-date">Date</Label>
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
          <Label htmlFor="occ-time">Heure</Label>
          <Input id="occ-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Précision publique pour cette date</Label>
        <RichTextEditor
          minHeight="8rem"
          aria-label="Précision publique"
          value={description}
          onChange={setDescription}
        />
        <p className="text-xs text-muted-foreground">
          S’ajoute à la description de la série (ex. « l’évêque de Yaoundé sera des nôtres »).
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="occ-note">Note interne pour cette date</Label>
        <Textarea
          id="occ-note"
          rows={3}
          maxLength={INTERNAL_NOTE_MAX_LENGTH}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Point de vigilance pour celui qui prépare…"
        />
        <p className="text-xs text-muted-foreground">
          Réservée à l’équipe : jamais visible du public.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
