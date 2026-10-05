'use client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/i18n/link';
import { isLocale, registerPhoneFormSchema, type RegisterPhoneFormValues } from '@churchy/shared';
import { useAppLocale } from '@/i18n/locale';
import { useAuth } from '@/hooks/useAuth';
import { PhoneNumberField } from '@/components/auth/PhoneNumberField';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PinInput } from '@/components/ui/pin-input';
import { Button } from '@/components/ui/button';
import { handleSubmitError } from '@/lib/forms/submit-error';

export function PhoneRegisterForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { registerPhone, loading } = useAuth();
  const locale = useAppLocale();

  const form = useForm<RegisterPhoneFormValues>({
    resolver: zodResolver(registerPhoneFormSchema),
    defaultValues: { phone: '', pin: '', confirmPin: '', firstName: '', lastName: '' },
    mode: 'onChange',
  });

  async function onSubmit({ confirmPin: _confirm, ...data }: RegisterPhoneFormValues) {
    try {
      // La langue de l'interface devient la langue du compte.
      await registerPhone({ ...data, ...(isLocale(locale) ? { locale } : {}) });
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      handleSubmitError(form, err, t('registerPhone.errorFallback'));
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
        <PhoneNumberField />
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('pin.label')}</FormLabel>
              <FormControl>
                <PinInput
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t('pin.hint')}</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('pin.confirm')}</FormLabel>
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
          {loading ? t('register.submitting') : t('register.submit')}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t('registerPhone.note')}</p>
      </form>
    </Form>
  );
}
