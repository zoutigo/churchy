'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/i18n/link';
import { loginSchema, type LoginDto } from '@churchy/shared';
import { useAuth } from '@/hooks/useAuth';
import { AuthLink } from '@/components/auth/AuthCard';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { handleSubmitError } from '@/lib/forms/submit-error';

interface Props {
  /** Destination après connexion (déjà validée par safeNextPath). */
  next?: string;
}

export function LoginForm({ next = '/dashboard' }: Props) {
  const router = useRouter();
  const { login, loading } = useAuth();

  const form = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: LoginDto) {
    try {
      await login(data);
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      handleSubmitError(form, err, 'Identifiants invalides');
    }
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Mot de passe</FormLabel>
                <span className="text-xs">
                  <AuthLink href="/forgot-password">Mot de passe oublié ?</AuthLink>
                </span>
              </div>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>
    </Form>
  );
}
