'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import {
  CELEBRATION_STEPS_SUNDAY_MASS,
  CelebrationType,
  createCelebrationTemplateSchema,
  uniqueKeys,
} from '@churchy/shared';
import { templatesApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { CELEBRATION_TYPE_LABELS } from '@/lib/format';

import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  parishId: string;
  /** Présent : modification de ce modèle (formulaire prérempli) ; absent : création. */
  template?: TemplateWithSteps;
  onDone: () => void;
  onCancel: () => void;
}

interface StepRow {
  id?: string;
  title: string;
}

/** Modèle de feuille de préparation : un nom, un type et la liste ordonnée des étapes (chant d'entrée, psaume…). */
export function TemplateForm({ parishId, template, onDone, onCancel }: Props) {
  const editing = !!template;
  const [name, setName] = useState(template?.name ?? '');
  const [type, setType] = useState<CelebrationType>(template?.type ?? CelebrationType.SUNDAY_MASS);
  const [description, setDescription] = useState(template?.description ?? '');
  // `id` : étape déjà enregistrée (sa clé est conservée à la modification) ; absent : nouvelle étape.
  const [steps, setSteps] = useState<StepRow[]>(
    template?.steps?.length
      ? template.steps.map((s) => ({ id: s.id, title: s.title }))
      : [{ title: '' }],
  );
  const [errors, setErrors] = useState<{ name?: string; steps?: string; root?: string }>({});
  const [busy, setBusy] = useState(false);

  const setStep = (i: number, value: string) =>
    setSteps(steps.map((s, j) => (j === i ? { ...s, title: value } : s)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...steps];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setSteps(next);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const rows = steps.map((s) => ({ ...s, title: s.title.trim() })).filter((s) => s.title);
    const titles = rows.map((s) => s.title);
    const parsed = createCelebrationTemplateSchema.safeParse({
      name: name.trim(),
      type,
      description: description.trim() || undefined,
    });
    const next: typeof errors = {};
    if (!parsed.success) next.name = parsed.error.flatten().fieldErrors.name?.[0] ?? 'Nom requis';
    if (titles.length === 0) next.steps = 'Ajoutez au moins une étape';
    setErrors(next);
    if (!parsed.success || titles.length === 0) return;

    const count = `${titles.length} étape${titles.length > 1 ? 's' : ''}`;
    const failure = editing
      ? 'Erreur lors de la modification du modèle'
      : 'Erreur lors de la création du modèle';
    setBusy(true);
    try {
      if (template) {
        await templatesApi.update(template.id, {
          name: parsed.data.name,
          type,
          description: parsed.data.description ?? null,
          steps: rows.map((s) => ({ id: s.id, title: s.title })),
        });
        notify.success('Modèle modifié', count);
      } else {
        const created = await templatesApi.create(parishId, parsed.data);
        const keys = uniqueKeys(titles);
        for (const [i, title] of titles.entries()) {
          await templatesApi.addStep(created.id, {
            title,
            key: keys[i],
            order: i + 1,
            isRequired: true,
          });
        }
        notify.success('Modèle créé', count);
      }
      onDone();
    } catch (err) {
      const message = errorMessage(err, failure);
      setErrors({ root: message });
      notify.error(failure, message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tpl-name">Nom du modèle</Label>
          <Input
            id="tpl-name"
            value={name}
            maxLength={100}
            placeholder="Messe dominicale"
            aria-invalid={!!errors.name || undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <p className="text-sm font-medium text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpl-type">Type</Label>
          <NativeSelect
            id="tpl-type"
            value={type}
            onChange={(e) => setType(e.target.value as CelebrationType)}
          >
            {Object.values(CelebrationType).map((t) => (
              <option key={t} value={t}>
                {CELEBRATION_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tpl-description">
          Description <span className="text-xs text-muted-foreground">(optionnel)</span>
        </Label>
        <Textarea
          id="tpl-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <fieldset className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <legend className="text-base font-semibold">Étapes de la feuille</legend>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSteps(CELEBRATION_STEPS_SUNDAY_MASS.map((s) => ({ title: s.title })))}
          >
            Pré-remplir : messe dominicale
          </Button>
        </div>
        <ol className="space-y-2">
          {steps.map(({ title }, i) => (
            <li key={steps[i].id ?? `new-${i}`} className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-right text-sm text-muted-foreground">
                {i + 1}.
              </span>
              <Input
                aria-label={`Étape ${i + 1}`}
                value={title}
                maxLength={100}
                placeholder="Ex. : Chant d’entrée"
                onChange={(e) => setStep(i, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={i === 0}
                aria-label={`Monter l’étape ${i + 1}`}
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={16} aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={i === steps.length - 1}
                aria-label={`Descendre l’étape ${i + 1}`}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={16} aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={steps.length === 1}
                aria-label={`Retirer l’étape ${i + 1}`}
                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
              >
                <X size={16} aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setSteps([...steps, { title: '' }])}
        >
          <Plus size={16} aria-hidden /> Ajouter une étape
        </Button>
        {errors.steps && <p className="text-sm font-medium text-destructive">{errors.steps}</p>}
      </fieldset>

      {errors.root && <p className="text-sm text-destructive">{errors.root}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={busy}>
          {editing
            ? busy
              ? 'Enregistrement…'
              : 'Enregistrer les modifications'
            : busy
              ? 'Création…'
              : 'Créer le modèle'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
