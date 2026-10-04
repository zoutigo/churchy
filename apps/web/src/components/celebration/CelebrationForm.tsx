'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CelebrationType,
  createCelebrationSchema,
  INTERNAL_NOTE_MAX_LENGTH,
  type CelebrationDetail,
  type UpdateCelebrationDto,
} from '@churchy/shared';
import { celebrationsApi, templatesApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { CELEBRATION_TYPE_LABELS } from '@/lib/format';
import { emptyDraft, previewDraft, type ScheduleDraft } from '@/lib/schedule-draft';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/rich-text/RichTextEditor';
import { ScheduleFields } from './ScheduleFields';

/** Champs saisis ; le planning reste un brouillon jusqu'à l'envoi, et un modèle vide = aucun modèle. */
const formSchema = createCelebrationSchema.omit({ schedule: true, templateId: true }).extend({
  templateId: z.string().optional(),
  schedule: z.custom<ScheduleDraft>(),
});
type FormValues = z.infer<typeof formSchema>;
type FormInput = z.input<typeof formSchema>;

const optionalHint = <span className="text-muted-foreground text-xs">(optionnel)</span>;

interface Props {
  parishId: string;
  /** Fuseau de la paroisse (heure locale du planning). */
  timezone: string;
  /** Création d'une série, ou modification des informations d'une série existante. */
  celebration?: CelebrationDetail;
  onDone: (celebration: CelebrationDetail) => void;
  onCancel: () => void;
}

export function CelebrationForm({ parishId, timezone, celebration, onDone, onCancel }: Props) {
  const editing = !!celebration;
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    templatesApi
      .findByParish(parishId)
      .then(setTemplates)
      .catch((err: unknown) =>
        setTemplatesError(err instanceof Error ? err.message : 'Impossible de charger les modèles'),
      );
  }, [parishId]);

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: celebration?.title ?? '',
      type: celebration?.type ?? CelebrationType.SUNDAY_MASS,
      location: celebration?.location ?? '',
      description: celebration?.description ?? '',
      internalNote: celebration?.internalNote ?? '',
      templateId: celebration?.defaultTemplate?.id ?? '',
      announced: celebration?.announced ?? false,
      schedule: emptyDraft(),
    },
    mode: 'onChange',
  });

  async function onSubmit(data: FormValues) {
    try {
      if (editing) {
        const dto: UpdateCelebrationDto = {
          title: data.title,
          type: data.type,
          location: data.location ?? '',
          description: data.description ?? '',
          internalNote: data.internalNote ?? '',
          announced: !!data.announced,
          defaultTemplateId: data.templateId || null,
        };
        const updated = await celebrationsApi.update(celebration.id, dto);
        notify.success('Célébration modifiée');
        onDone(updated);
        return;
      }

      const preview = previewDraft(data.schedule, timezone);
      if (preview.blank || !preview.schedule || preview.error || preview.instants.length === 0) {
        form.setError('schedule', {
          type: 'validate',
          message: preview.error ?? 'Indiquez au moins une date',
        });
        return;
      }
      const created = await celebrationsApi.create(parishId, {
        title: data.title,
        type: data.type,
        location: data.location,
        description: data.description,
        internalNote: data.internalNote,
        announced: !!data.announced,
        templateId: data.templateId || undefined,
        schedule: preview.schedule,
      });
      notify.success(
        'Célébration créée',
        created.occurrences.length > 1
          ? `${created.occurrences.length} dates programmées`
          : '1 date programmée',
      );
      onDone(created);
    } catch (err: unknown) {
      handleSubmitError(
        form,
        err,
        editing ? 'Erreur lors de la modification' : 'Erreur lors de la création',
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Titre</FormLabel>
                <FormControl>
                  <Input placeholder="Messe du dimanche" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    {Object.values(CelebrationType).map((t) => (
                      <option key={t} value={t}>
                        {CELEBRATION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lieu {optionalHint}</FormLabel>
                <FormControl>
                  <Input placeholder="Église Saint-Pierre" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="templateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modèle de feuille par défaut {optionalHint}</FormLabel>
                <FormControl>
                  <NativeSelect {...field} value={field.value ?? ''}>
                    <option value="">Aucun — feuille construite à la volée</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.steps?.length ?? 0} étapes)
                      </option>
                    ))}
                  </NativeSelect>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {templatesError ??
                    'Proposé pour chaque date ; celui qui prépare peut en changer à tout moment.'}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description publique {optionalHint}</FormLabel>
              <FormControl>
                <RichTextEditor
                  minHeight="8rem"
                  aria-label="Description publique"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!form.formState.errors.description}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Visible de tous sur la page de la paroisse (ex. « l’évêque de Yaoundé sera des
                nôtres »).
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="internalNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note interne {optionalHint}</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  maxLength={INTERNAL_NOTE_MAX_LENGTH}
                  placeholder="Point de vigilance pour celui qui prépare la messe…"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Réservée à l’équipe de préparation : jamais visible du public.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {!editing && (
          <FormField
            control={form.control}
            name="schedule"
            render={({ field }) => (
              <FormItem>
                <p className="text-base font-semibold leading-none">Dates</p>
                <ScheduleFields
                  value={field.value as ScheduleDraft}
                  onChange={(v) => {
                    field.onChange(v);
                    form.clearErrors('schedule');
                  }}
                  timezone={timezone}
                  invalid={!!form.formState.errors.schedule}
                />
                {form.formState.errors.schedule && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {form.formState.errors.schedule.message as string}
                  </p>
                )}
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="announced"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              </FormControl>
              <div>
                <FormLabel>Publier la série au public</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Toutes les dates apparaissent sur la page de la paroisse, « feuille en préparation
                  » jusqu’à la publication de chaque feuille.
                </p>
              </div>
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? editing
                ? 'Enregistrement…'
                : 'Création…'
              : editing
                ? 'Enregistrer'
                : 'Créer la célébration'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  );
}
