'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordDto } from '@churchy/shared';
import { authApi } from '@/lib/api/auth.api';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { handleSubmitError } from '@/lib/forms/submit-error';

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordDto>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: ForgotPasswordDto) {
    try {
      await authApi.forgotPassword(data);
      setSentTo(data.email);
    } catch (err: unknown) {
      handleSubmitError(form, err, "Impossible d'envoyer le lien");
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <MailCheck size={16} />
          <AlertTitle>Vérifiez votre boîte mail</AlertTitle>
          <AlertDescription>
            Si un compte existe pour <strong>{sentTo}</strong>, un lien de réinitialisation vient
            d&apos;être envoyé. Il est valable 1 heure. Pensez à regarder dans vos courriers
            indésirables.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="outline" className="w-full" onClick={() => setSentTo(null)}>
          Utiliser une autre adresse
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="vous@paroisse.fr"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
        </Button>
      </form>
    </Form>
  );
}
