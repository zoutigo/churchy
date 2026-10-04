'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAnnouncementSchema, type CreateAnnouncementDto } from '@churchy/shared';
import { announcementsApi } from '@/lib/api/announcements.api';
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
import { RichTextEditor } from '@/components/rich-text/RichTextEditor';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';

const optionalHint = <span className="text-muted-foreground text-xs">(optionnel)</span>;

export function CreateAnnouncementForm({
  parishId,
  onSuccess,
}: {
  parishId: string;
  onSuccess?: () => void;
}) {
  const form = useForm<CreateAnnouncementDto>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: { title: '', summary: '', body: '', imageUrl: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: CreateAnnouncementDto) {
    try {
      await announcementsApi.create(parishId, data);
      notify.success('Annonce publiée');
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      handleSubmitError(form, err, 'Erreur lors de la publication');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre</FormLabel>
              <FormControl>
                <Input placeholder="Changement d’horaire de la messe du dimanche" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Résumé {optionalHint}</FormLabel>
              <FormControl>
                <Input placeholder="Une phrase pour résumer l’annonce" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contenu</FormLabel>
              <FormControl>
                <RichTextEditor
                  aria-label="Contenu"
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
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse d’une image {optionalHint}</FormLabel>
              <FormControl>
                <Input type="url" inputMode="url" placeholder="https://…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Publication…' : 'Publier l’annonce'}
        </Button>
      </form>
    </Form>
  );
}
