'use client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { useLocale } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/i18n/link';
import { isLocale, registerFormSchema, type RegisterFormValues } from '@churchy/shared';
import { useAuth } from '@/hooks/useAuth';
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

export function RegisterForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { register, loading } = useAuth();
  const locale = useLocale();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', firstName: '', lastName: '' },
    mode: 'onChange',
  });

  async function onSubmit({ confirmPassword: _confirm, ...data }: RegisterFormValues) {
    try {
      // La langue de l'interface devient la langue du compte.
      await register({ ...data, ...(isLocale(locale) ? { locale } : {}) });
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      handleSubmitError(form, err, t('register.errorFallback'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('register.firstName')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('register.firstNamePlaceholder')}
                    autoComplete="given-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('register.lastName')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('register.lastNamePlaceholder')}
                    autoComplete="family-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('email')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder')}
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
              <FormLabel>{t('password')}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder={t('passwordHint')}
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('confirmPassword')}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t('register.submitting') : t('register.submit')}
        </Button>
      </form>
    </Form>
  );
}
