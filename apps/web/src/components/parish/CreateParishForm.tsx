'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createParishSchema, type CreateParishDto } from '@churchy/shared';
import { parishesApi } from '@/lib/api/parishes.api';
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
import { Textarea } from '@/components/ui/textarea';

interface Props {
  onSuccess?: () => void;
}

export function CreateParishForm({ onSuccess }: Props) {
  const form = useForm<CreateParishDto>({
    resolver: zodResolver(createParishSchema),
    defaultValues: { name: '', description: '', city: '', country: 'France' },
    mode: 'onChange',
  });

  async function onSubmit(data: CreateParishDto) {
    try {
      await parishesApi.create(data);
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Erreur lors de la création',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la paroisse</FormLabel>
              <FormControl>
                <Input placeholder="Saint-Pierre de Montmartre" {...field} />
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
              <FormLabel>Description <span className="text-muted-foreground text-xs">(optionnel)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Décrivez votre paroisse..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ville</FormLabel>
                <FormControl>
                  <Input placeholder="Paris" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pays</FormLabel>
                <FormControl>
                  <Input placeholder="France" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Création...' : 'Créer la paroisse'}
        </Button>
      </form>
    </Form>
  );
}
