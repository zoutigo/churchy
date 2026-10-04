'use client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/i18n/link';
import { z } from 'zod';
import { ERR } from '@churchy/shared';
import { resetPasswordSchema } from '@churchy/shared';
import { authApi } from '@/lib/api/auth.api';
import { AuthLink } from '@/components/auth/AuthCard';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { handleSubmitError } from '@/lib/forms/submit-error';

export const resetFormSchema = z
  .object({
    password: resetPasswordSchema.shape.password,
    confirmPassword: z.string().min(1, ERR.confirmPasswordRequired),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: ERR.passwordsMismatch,
  });

type ResetFormValues = z.infer<typeof resetFormSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('auth');
  const router = useRouter();

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: ResetFormValues) {
    try {
      await authApi.resetPassword({ token, password: data.password });
      router.push('/login?reset=1');
    } catch (err: unknown) {
      handleSubmitError(form, err, t('reset.errorFallback'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('reset.newPassword')}</FormLabel>
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
              <FormLabel>{t('reset.confirm')}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <div role="alert" className="text-sm text-destructive space-y-1">
            <p>{form.formState.errors.root.message}</p>
            <p>
              <AuthLink href="/forgot-password">{t('reset.newLink')}</AuthLink>
            </p>
          </div>
        )}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('reset.saving') : t('reset.submit')}
        </Button>
      </form>
    </Form>
  );
}
