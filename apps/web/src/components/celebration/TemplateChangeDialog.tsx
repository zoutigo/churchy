'use client';
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
      .catch((err) => !cancelled && setError(errorMessage(err, 'Impossible de calculer l’aperçu')));
    return () => {
      cancelled = true;
    };
  }, [open, sheetId, choice]);

  async function apply() {
    setBusy(true);
    try {
      const res = await celebrationsApi.changeTemplate(sheetId, {
        templateId: choice === BLANK ? null : choice,
      });
      notify.success('Modèle changé', 'Le contenu déjà placé a été conservé');
      onChanged(res.sheet);
      onOpenChange(false);
    } catch (err) {
      const message = errorMessage(err, 'Erreur lors du changement de modèle');
      setError(message);
      notify.error('Erreur lors du changement de modèle', message);
    } finally {
      setBusy(false);
    }
  }

  const unchanged = choice === (currentTemplateId ?? BLANK);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="template-change-dialog">
        <DialogHeader>
          <DialogTitle>Changer de modèle</DialogTitle>
          <DialogDescription>
            Les étapes de même nom gardent leur contenu. Une étape remplie sans équivalent est
            conservée comme étape libre.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="change-template">Nouveau modèle</Label>
          <NativeSelect
            id="change-template"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.steps?.length ?? 0} étapes)
              </option>
            ))}
            <option value={BLANK}>Aucun — à la volée</option>
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
            <p className="text-muted-foreground">Calcul de l’aperçu…</p>
          ) : unchanged ? (
            <p className="text-muted-foreground">C’est le modèle actuel de la feuille.</p>
          ) : (
            <>
              <Group title="Conservées" items={report.kept} tone="text-churchy-700" />
              <Group title="Ajoutées (vides)" items={report.added} />
              <Group
                title="Gardées comme étapes libres"
                items={report.keptAsFree}
                tone="text-amber-700"
              />
              <Group title="Retirées (vides)" items={report.removed} tone="text-destructive" />
              {Object.values(report).every((g: unknown[]) => g.length === 0) && (
                <p className="text-muted-foreground">Aucune étape ne change.</p>
              )}
            </>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" disabled={busy || !report || unchanged} onClick={apply}>
            {busy ? 'Application…' : 'Changer de modèle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
