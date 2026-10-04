'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Content, SheetView } from '@churchy/shared';
import { celebrationsApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepCard } from './StepCard';
import { TemplateChangeDialog } from './TemplateChangeDialog';

interface Props {
  sheet: SheetView;
  templates: TemplateWithSteps[];
  contents: Content[];
  /** Date passée ou annulée : la feuille se consulte, elle ne se modifie plus. */
  readOnly: boolean;
  onChange: (sheet: SheetView) => void;
  /** Après une publication réussie : la page quitte la feuille (retour à la série). */
  onPublished?: () => void;
}

/** Feuille de préparation d'une date : étapes, ordre, ajout à la volée, changement de modèle, publication. */
export function SheetPanel({ sheet, templates, contents, readOnly, onChange, onPublished }: Props) {
  const t = useTranslations('sheetPanel');
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const published = sheet.status === 'PUBLISHED';
  const template = templates.find((tpl) => tpl.id === sheet.templateId);

  /** Exécute un appel, met la feuille à jour et annonce le résultat par un toast. */
  async function run(call: () => Promise<SheetView>, success: string, failure: string) {
    try {
      onChange(await call());
      notify.success(success);
      return true;
    } catch (err) {
      notify.error(failure, errorMessage(err, failure));
      return false;
    }
  }

  async function togglePublish() {
    setBusy(true);
    const ok = await run(
      () =>
        published
          ? celebrationsApi.unpublishSheet(sheet.id)
          : celebrationsApi.publishSheet(sheet.id),
      published ? t('unpublished') : t('published'),
      published ? t('unpublishError') : t('publishError'),
    );
    setBusy(false);
    // Publier est l'aboutissement du travail : on ne reste pas devant le formulaire.
    if (ok && !published) onPublished?.();
  }

  async function move(index: number, direction: -1 | 1) {
    const ids = sheet.steps.map((s) => s.id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(
      () => celebrationsApi.reorderSteps(sheet.id, { stepIds: ids }),
      t('orderSaved'),
      t('orderError'),
    );
  }

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    await run(
      () => celebrationsApi.addStep(sheet.id, { title }),
      t('stepAdded'),
      t('addStepError'),
    );
    setNewTitle('');
  }

  return (
    <div className="space-y-4" data-testid="sheet-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm">
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                published
                  ? 'border-churchy-300 bg-churchy-200 text-churchy-700'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
              data-testid="sheet-status"
            >
              {published ? t('statusPublished') : t('statusDraft')}
            </span>
          </p>
          <p className="text-sm text-muted-foreground" data-testid="sheet-template-name">
            {sheet.templateId ? t('template', { name: template?.name ?? '—' }) : t('onTheFly')}
          </p>
        </div>
        {!readOnly && (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="outline" onClick={() => setChanging(true)}>
              {t('changeTemplate')}
            </Button>
            <Button type="button" disabled={busy} onClick={togglePublish}>
              {published ? t('unpublish') : t('publish')}
            </Button>
          </div>
        )}
      </div>

      {sheet.steps.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <ol className="space-y-3">
          {sheet.steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              total={sheet.steps.length}
              contents={contents}
              readOnly={readOnly}
              onChange={(patch) =>
                run(
                  () => celebrationsApi.updateStep(sheet.id, step.id, patch),
                  t('stepSaved'),
                  t('stepSaveError'),
                )
              }
              onMove={(d) => move(index, d)}
              onRemove={() =>
                run(
                  () => celebrationsApi.removeStep(sheet.id, step.id),
                  t('stepRemoved'),
                  t('stepRemoveError'),
                )
              }
            />
          ))}
        </ol>
      )}

      {!readOnly && (
        <form
          onSubmit={addStep}
          className="flex flex-col gap-2 sm:flex-row"
          data-testid="add-step-form"
        >
          <Input
            aria-label={t('newStepAria')}
            placeholder={t('newStepPlaceholder')}
            value={newTitle}
            maxLength={100}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Button type="submit" variant="outline" className="gap-2" disabled={!newTitle.trim()}>
            <Plus size={16} aria-hidden /> {t('addStep')}
          </Button>
        </form>
      )}

      <TemplateChangeDialog
        open={changing}
        onOpenChange={setChanging}
        sheetId={sheet.id}
        currentTemplateId={sheet.templateId}
        templates={templates}
        onChanged={onChange}
      />
    </div>
  );
}
