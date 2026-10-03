'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DEFAULT_COUNTRY,
  createParishSchema,
  withCompletePhone,
  type CreateParishDto,
} from '@churchy/shared';
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
import { LocationFields } from './LocationFields';
import { PhoneField } from './PhoneField';

interface Props {
  onSuccess?: () => void;
}

export function CreateParishForm({ onSuccess }: Props) {
  const form = useForm<CreateParishDto>({
    resolver: zodResolver(withCompletePhone(createParishSchema)),
    defaultValues: {
      name: '',
      description: '',
      country: DEFAULT_COUNTRY,
      region: '',
      city: '',
      district: '',
      addressComplement: '',
      phone: '',
      email: '',
    },
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
                <Input placeholder="Paroisse Saint-Joseph de Mvog-Ada" {...field} />
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
              <FormLabel>
                Description <span className="text-muted-foreground text-xs">(optionnel)</span>
              </FormLabel>
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
        <LocationFields />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="addressComplement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Complément d’adresse{' '}
                  <span className="text-muted-foreground text-xs">(optionnel)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="En face de la poste centrale" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <PhoneField optionalHint />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email de la paroisse{' '}
                  <span className="text-muted-foreground text-xs">(optionnel)</span>
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@paroisse.org" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Création...' : 'Créer la paroisse'}
        </Button>
      </form>
    </Form>
  );
}
