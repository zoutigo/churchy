'use client';
import { useTranslations } from 'next-intl';
import { useLabels } from '@/i18n/labels';
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
  const t = useTranslations('celebrationForm');
  const tc = useTranslations('common');
  const labels = useLabels();
  const optionalHint = <span className="text-muted-foreground text-xs">{tc('optional')}</span>;
  const editing = !!celebration;
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    templatesApi
      .findByParish(parishId)
      .then(setTemplates)
      .catch((err: unknown) =>
        setTemplatesError(err instanceof Error ? err.message : t('templatesError')),
      );
  }, [parishId, t]);

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
        notify.success(t('updated'));
        onDone(updated);
        return;
      }

      const preview = previewDraft(data.schedule, timezone);
      if (preview.blank || !preview.schedule || preview.error || preview.instants.length === 0) {
        form.setError('schedule', {
          type: 'validate',
          message: preview.error ?? t('atLeastOneDate'),
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
      notify.success(t('created'), t('scheduled', { count: created.occurrences.length }));
      onDone(created);
    } catch (err: unknown) {
      handleSubmitError(form, err, editing ? t('updateError') : t('createError'));
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
                <FormLabel>{t('title')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('titlePlaceholder')} {...field} />
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
                <FormLabel>{t('type')}</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    {Object.values(CelebrationType).map((type) => (
                      <option key={type} value={type}>
                        {labels.celebrationType(type)}
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
                <FormLabel>
                  {t('location')} {optionalHint}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('locationPlaceholder')}
                    {...field}
                    value={field.value ?? ''}
                  />
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
                <FormLabel>
                  {t('template')} {optionalHint}
                </FormLabel>
                <FormControl>
                  <NativeSelect {...field} value={field.value ?? ''}>
                    <option value="">{t('noTemplate')}</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({t('steps', { count: tpl.steps?.length ?? 0 })})
                      </option>
                    ))}
                  </NativeSelect>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {templatesError ?? t('templateHint')}
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
              <FormLabel>
                {t('publicDescription')} {optionalHint}
              </FormLabel>
              <FormControl>
                <RichTextEditor
                  minHeight="8rem"
                  aria-label={t('publicDescription')}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!form.formState.errors.description}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t('publicDescriptionHint')}</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="internalNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('internalNote')} {optionalHint}
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  maxLength={INTERNAL_NOTE_MAX_LENGTH}
                  placeholder={t('internalNotePlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t('internalNoteHint')}</p>
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
                <p className="text-base font-semibold leading-none">{t('dates')}</p>
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
                <FormLabel>{t('announce')}</FormLabel>
                <p className="text-xs text-muted-foreground">{t('announceHint')}</p>
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
                ? t('saving')
                : t('creating')
              : editing
                ? tc('save')
                : t('submitCreate')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {tc('cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
