'use client';
import { useState } from 'react';
import type { SheetView } from '@churchy/shared';
import { celebrationsApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';

interface Props {
  occurrenceId: string;
  templates: TemplateWithSteps[];
  /** Modèle par défaut de la série (proposé en premier). */
  defaultTemplate: { id: string; name: string } | null;
  onCreated: (sheet: SheetView) => void;
}

const BLANK = '__blank__';

/** Création de la feuille d'une date : depuis le modèle par défaut, un autre modèle, ou à la volée (vide). */
export function SheetCreator({ occurrenceId, templates, defaultTemplate, onCreated }: Props) {
  const [choice, setChoice] = useState<string>(defaultTemplate?.id ?? BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const sheet = await celebrationsApi.createSheet(occurrenceId, {
        templateId: choice === BLANK ? null : choice,
      });
      notify.success('Feuille créée', choice === BLANK ? 'Feuille vide, à compléter' : undefined);
      onCreated(sheet);
    } catch (err) {
      const message = errorMessage(err, 'Erreur lors de la création de la feuille');
      setError(message);
      notify.error('Erreur lors de la création de la feuille', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="space-y-4 rounded-lg border border-dashed p-4 sm:p-6"
      data-testid="sheet-creator"
    >
      <div>
        <h3 className="font-semibold">Cette date n’a pas encore de feuille de préparation</h3>
        <p className="text-sm text-muted-foreground">
          Partez d’un modèle de la paroisse, ou construisez la feuille à la volée.
        </p>
      </div>
      <div className="max-w-md space-y-1.5">
        <Label htmlFor="sheet-template">Modèle</Label>
        <NativeSelect
          id="sheet-template"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
        >
          {defaultTemplate && (
            <option value={defaultTemplate.id}>Modèle par défaut — {defaultTemplate.name}</option>
          )}
          {templates
            .filter((t) => t.id !== defaultTemplate?.id)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.steps?.length ?? 0} étapes)
              </option>
            ))}
          <option value={BLANK}>À la volée — feuille vide</option>
        </NativeSelect>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="button" disabled={busy} onClick={create} className="w-full sm:w-auto">
        {busy ? 'Création…' : 'Créer la feuille'}
      </Button>
    </div>
  );
}
