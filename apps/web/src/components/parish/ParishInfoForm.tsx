'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateParishSchema, type Parish, type UpdateParishDto } from '@churchy/shared';
import { parishesApi } from '@/lib/api/parishes.api';
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
import { Textarea } from '@/components/ui/textarea';

type Field = keyof UpdateParishDto;

const TEXT_FIELDS: { name: Field; label: string; placeholder?: string; type?: string }[] = [
  { name: 'district', label: 'Quartier', placeholder: 'Croix-Rousse' },
  { name: 'mainChurch', label: 'Église principale', placeholder: 'Église Saint-Pierre' },
  { name: 'address', label: 'Adresse', placeholder: '1 place de l’Église' },
  { name: 'phone', label: 'Téléphone', placeholder: '04 00 00 00 00', type: 'tel' },
  { name: 'email', label: 'Email de la paroisse', type: 'email' },
  { name: 'website', label: 'Site web', placeholder: 'https://…', type: 'url' },
  { name: 'imageUrl', label: 'Adresse de la photo', placeholder: 'https://…', type: 'url' },
];

/** Identité publique de la paroisse : ce qui s'affiche sur sa page et dans les résultats de recherche. */
export function ParishInfoForm({
  parish,
  onSaved,
}: {
  parish: Parish;
  onSaved?: (p: Parish) => void;
}) {
  const form = useForm<UpdateParishDto>({
    resolver: zodResolver(updateParishSchema),
    defaultValues: {
      description: parish.description ?? '',
      district: parish.district ?? '',
      mainChurch: parish.mainChurch ?? '',
      address: parish.address ?? '',
      phone: parish.phone ?? '',
      email: parish.email ?? '',
      website: parish.website ?? '',
      imageUrl: parish.imageUrl ?? '',
    },
    mode: 'onChange',
  });

  async function onSubmit(data: UpdateParishDto) {
    try {
      const saved = await parishesApi.update(parish.id, data);
      form.clearErrors('root');
      onSaved?.(saved);
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Erreur lors de l’enregistrement',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Présentation</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Quelques lignes pour présenter la paroisse"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.label}</FormLabel>
                  <FormControl>
                    <Input
                      type={f.type}
                      placeholder={f.placeholder}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>
    </Form>
  );
}
