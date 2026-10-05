'use client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/i18n/link';
import { loginPhoneSchema } from '@churchy/shared';
import { useAuth } from '@/hooks/useAuth';
import { AuthLink } from '@/components/auth/AuthCard';
import { PhoneNumberField } from '@/components/auth/PhoneNumberField';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PinInput } from '@/components/ui/pin-input';
import { Button } from '@/components/ui/button';
import { handleSubmitError } from '@/lib/forms/submit-error';

interface Values {
  phone: string;
  pin: string;
}

interface Props {
  /** Destination après connexion (déjà validée par safeNextPath). */
  next?: string;
}

export function PhoneLoginForm({ next = '/dashboard' }: Props) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { loginPhone, loading } = useAuth();

  const form = useForm<Values>({
    resolver: zodResolver(loginPhoneSchema),
    defaultValues: { phone: '', pin: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: Values) {
    try {
      await loginPhone(data);
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      handleSubmitError(form, err, t('loginPhone.errorFallback'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <PhoneNumberField />
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{t('pin.label')}</FormLabel>
                <span className="text-xs">
                  <AuthLink href="/forgot-pin">{t('loginPhone.forgot')}</AuthLink>
                </span>
              </div>
              <FormControl>
                <PinInput
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value}
                  onChange={field.onChange}
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>
    </Form>
  );
}
