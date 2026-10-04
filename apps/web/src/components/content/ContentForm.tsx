'use client';
import { useTranslations } from 'next-intl';
import { useLabels } from '@/i18n/labels';
import { useAppLocale } from '@/i18n/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createContentSchema,
  type Content,
  type CreateContentDto,
  ContentType,
} from '@churchy/shared';
import { contentsApi } from '@/lib/api/contents.api';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/rich-text/RichTextEditor';
import { Button } from '@/components/ui/button';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';

interface Props {
  parishId: string;
  /** Contenu à modifier : sans lui, le formulaire crée un nouveau contenu. */
  content?: Content;
  onSuccess?: (saved: Content) => void;
}

export function ContentForm({ parishId, content, onSuccess }: Props) {
  const t = useTranslations('contentForm');
  const labels = useLabels();
  const locale = useAppLocale();
  const editing = !!content;
  const form = useForm<CreateContentDto>({
    resolver: zodResolver(createContentSchema),
    defaultValues: {
      title: content?.title ?? '',
      type: content?.type ?? ContentType.FREE_TEXT,
      body: content?.body ?? '',
      language: content?.language ?? locale,
      tags: content?.tags ?? [],
    },
    mode: 'onChange',
  });

  async function onSubmit(data: CreateContentDto) {
    try {
      const saved = content
        ? await contentsApi.update(content.id, data)
        : await contentsApi.create(parishId, data);
      notify.success(
        editing ? t('updated') : t('added'),
        editing ? t('updatedText', { title: data.title }) : t('addedText', { title: data.title }),
      );
      if (!editing) form.reset();
      onSuccess?.(saved);
    } catch (err: unknown) {
      handleSubmitError(form, err, editing ? t('updateError') : t('createError'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('chooseType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ContentType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {labels.contentType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('body')}</FormLabel>
              <FormControl>
                <RichTextEditor
                  aria-label={t('body')}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!form.formState.errors.body}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? t('saving')
            : editing
              ? t('saveChanges')
              : t('submitCreate')}
        </Button>
      </form>
    </Form>
  );
}
