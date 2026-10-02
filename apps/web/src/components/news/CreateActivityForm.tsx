'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createActivitySchema } from '@churchy/shared';
import { activitiesApi } from '@/lib/api/activities.api';
import { localInputToIso } from '@/lib/datetime';
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

/** Le champ date du navigateur donne une heure locale sans fuseau : convertie en ISO à l'envoi. */
const formSchema = createActivitySchema.extend({
  startsAt: z.string().min(1, 'Date et heure requises'),
});
type FormValues = z.infer<typeof formSchema>;

const optionalHint = <span className="text-muted-foreground text-xs">(optionnel)</span>;

export function CreateActivityForm({
  parishId,
  onSuccess,
}: {
  parishId: string;
  onSuccess?: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', description: '', startsAt: '', location: '', imageUrl: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: FormValues) {
    const startsAt = localInputToIso(data.startsAt);
    if (!startsAt) {
      form.setError('startsAt', { message: 'Date et heure invalides' });
      return;
    }
    try {
      await activitiesApi.create(parishId, { ...data, startsAt });
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Erreur lors de la publication',
      });
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
                <Input placeholder="Groupe de jeunes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <RichTextEditor
                  aria-label="Description"
                  allowImages
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!form.formState.errors.description}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date et heure</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lieu {optionalHint}</FormLabel>
                <FormControl>
                  <Input placeholder="Salle paroissiale" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
          {form.formState.isSubmitting ? 'Publication…' : 'Publier l’activité'}
        </Button>
      </form>
    </Form>
  );
}
