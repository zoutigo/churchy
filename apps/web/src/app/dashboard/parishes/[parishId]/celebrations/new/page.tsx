'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createCelebrationSchema, type CreateCelebrationDto } from '@churchy/shared';
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

interface Props {
  params: { parishId: string };
}

export default function NewCelebrationPage({ params }: Props) {
  const { parishId } = params;
  const router = useRouter();

  const form = useForm<CreateCelebrationDto>({
    resolver: zodResolver(createCelebrationSchema),
    defaultValues: { templateId: '', title: '', date: '', location: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: CreateCelebrationDto) {
    try {
      const celebration = await celebrationsApi.create(parishId, data);
      router.push(`/dashboard/parishes/${parishId}/celebrations`);
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Erreur lors de la création',
      });
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Nouvelle célébration</h1>
        <p className="text-muted-foreground">Créer une célébration à partir d&apos;un modèle</p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>Lieu <span className="text-muted-foreground text-xs">(optionnel)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Église Saint-Pierre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}
            <div className="flex gap-3">
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
    </div>
  );
}
