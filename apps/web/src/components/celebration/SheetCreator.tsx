'use client';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('sheetCreator');
  const tf = useTranslations('celebrationForm');
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
      notify.success(t('created'), choice === BLANK ? t('blankHint') : undefined);
      onCreated(sheet);
    } catch (err) {
      const message = errorMessage(err, t('error'));
      setError(message);
      notify.error(t('error'), message);
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
        <h3 className="font-semibold">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">{t('hint')}</p>
      </div>
      <div className="max-w-md space-y-1.5">
        <Label htmlFor="sheet-template">{t('template')}</Label>
        <NativeSelect
          id="sheet-template"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
        >
          {defaultTemplate && (
            <option value={defaultTemplate.id}>
              {t('defaultTemplate', { name: defaultTemplate.name })}
            </option>
          )}
          {templates
            .filter((tpl) => tpl.id !== defaultTemplate?.id)
            .map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} ({tf('steps', { count: tpl.steps?.length ?? 0 })})
              </option>
            ))}
          <option value={BLANK}>{t('blank')}</option>
        </NativeSelect>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="button" disabled={busy} onClick={create} className="w-full sm:w-auto">
        {busy ? t('creating') : t('create')}
      </Button>
    </div>
  );
}
