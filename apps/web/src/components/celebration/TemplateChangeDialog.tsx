'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { SheetView, TemplateChangeReport } from '@churchy/shared';
import { celebrationsApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  currentTemplateId: string | null;
  templates: TemplateWithSteps[];
  onChanged: (sheet: SheetView) => void;
}

const BLANK = '__blank__';

function Group({
  title,
  items,
  tone,
}: {
  title: string;
  items: { key: string; title: string }[];
  tone?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`font-medium ${tone ?? ''}`}>
        {title} ({items.length})
      </p>
      <p className="text-muted-foreground">{items.map((i) => i.title).join(', ')}</p>
    </div>
  );
}

/**
 * Changement de modèle d'une feuille : on choisit le modèle, un aperçu indique ce qui sera conservé, ajouté
 * ou retiré (rien de rempli n'est perdu), puis on confirme.
 */
export function TemplateChangeDialog({
  open,
  onOpenChange,
  sheetId,
  currentTemplateId,
  templates,
  onChanged,
}: Props) {
  const t = useTranslations('templateChange');
  const tc = useTranslations('common');
  const tf = useTranslations('celebrationForm');
  const [choice, setChoice] = useState<string>(currentTemplateId ?? BLANK);
  const [report, setReport] = useState<TemplateChangeReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChoice(currentTemplateId ?? BLANK);
  }, [open, currentTemplateId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReport(null);
    setError(null);
    celebrationsApi
      .changeTemplate(sheetId, { templateId: choice === BLANK ? null : choice, dryRun: true })
      .then((res) => !cancelled && setReport(res.report))
      .catch((err) => !cancelled && setError(errorMessage(err, t('previewError'))));
    return () => {
      cancelled = true;
    };
  }, [open, sheetId, choice, t]);

  async function apply() {
    setBusy(true);
    try {
      const res = await celebrationsApi.changeTemplate(sheetId, {
        templateId: choice === BLANK ? null : choice,
      });
      notify.success(t('changed'), t('changedHint'));
      onChanged(res.sheet);
      onOpenChange(false);
    } catch (err) {
      const message = errorMessage(err, t('error'));
      setError(message);
      notify.error(t('error'), message);
    } finally {
      setBusy(false);
    }
  }

  const unchanged = choice === (currentTemplateId ?? BLANK);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="template-change-dialog">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="change-template">{t('newTemplate')}</Label>
          <NativeSelect
            id="change-template"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} ({tf('steps', { count: tpl.steps?.length ?? 0 })})
              </option>
            ))}
            <option value={BLANK}>{t('none')}</option>
          </NativeSelect>
        </div>
        <div
          className="space-y-2 rounded-md bg-muted/50 p-3 text-sm"
          aria-live="polite"
          data-testid="template-change-report"
        >
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : !report ? (
            <p className="text-muted-foreground">{t('computing')}</p>
          ) : unchanged ? (
            <p className="text-muted-foreground">{t('current')}</p>
          ) : (
            <>
              <Group title={t('kept')} items={report.kept} tone="text-churchy-700" />
              <Group title={t('added')} items={report.added} />
              <Group title={t('keptAsFree')} items={report.keptAsFree} tone="text-amber-700" />
              <Group title={t('removed')} items={report.removed} tone="text-destructive" />
              {Object.values(report).every((g: unknown[]) => g.length === 0) && (
                <p className="text-muted-foreground">{t('nothing')}</p>
              )}
            </>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button type="button" disabled={busy || !report || unchanged} onClick={apply}>
            {busy ? t('applying') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
