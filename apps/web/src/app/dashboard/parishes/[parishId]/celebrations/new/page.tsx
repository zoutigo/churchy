'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { createCelebrationSchema } from '@churchy/shared';
import { localInputToIso } from '@/lib/datetime';
import { celebrationsApi } from '@/lib/api/celebrations.api';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormView } from '@/components/layout/FormView';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';

/** Le champ date du navigateur donne une heure locale sans fuseau : convertie en ISO à l'envoi. */
const formSchema = createCelebrationSchema.extend({
  date: z.string().min(1, 'Date et heure requises'),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  params: { parishId: string };
}

export default function NewCelebrationPage({ params }: Props) {
  const { parishId } = params;
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { templateId: '', title: '', date: '', location: '', announced: false },
    mode: 'onChange',
  });

  async function onSubmit(data: FormValues) {
    const date = localInputToIso(data.date);
    if (!date) {
      form.setError('date', { message: 'Date et heure invalides' });
      return;
    }
    try {
      await celebrationsApi.create(parishId, { ...data, date });
      notify.success('Célébration créée');
      router.push(`/dashboard/parishes/${parishId}/celebrations`);
    } catch (err: unknown) {
      handleSubmitError(form, err, 'Erreur lors de la création');
    }
  }

  return (
    <FormView
      title="Nouvelle célébration"
      description="Créer une célébration à partir d’un modèle"
      onBack={() => router.back()}
    >
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID du modèle</FormLabel>
                    <FormControl>
                      <Input placeholder="ID du modèle de célébration" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre</FormLabel>
                    <FormControl>
                      <Input placeholder="Messe du dimanche 25 mai" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
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
                    <FormLabel>
                      Lieu <span className="text-muted-foreground text-xs">(optionnel)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Église Saint-Pierre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="announced"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </FormControl>
                  <div>
                    <FormLabel>Annoncer au public (feuille en préparation)</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      La messe apparaît sur la page de la paroisse avant la publication de la
                      feuille.
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
                {form.formState.isSubmitting ? 'Création...' : 'Créer la célébration'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </FormView>
  );
}
