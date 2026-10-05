'use client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/i18n/link';
import { resetPinFormSchema, type ResetPinFormValues } from '@churchy/shared';
import { authApi } from '@/lib/api/auth.api';
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
import { notify } from '@/lib/notify';

export function ResetPinForm({ token }: { token: string }) {
  const t = useTranslations('auth');
  const router = useRouter();

  const form = useForm<ResetPinFormValues>({
    resolver: zodResolver(resetPinFormSchema),
    defaultValues: { pin: '', confirmPin: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: ResetPinFormValues) {
    try {
      await authApi.resetPin({ token, pin: data.pin });
      notify.success(t('resetPin.done'));
      router.push('/login?reset=pin');
    } catch (err: unknown) {
      handleSubmitError(form, err, t('resetPin.errorFallback'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {(['pin', 'confirmPin'] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{name === 'pin' ? t('resetPin.newPin') : t('pin.confirm')}</FormLabel>
                <FormControl>
                  <PinInput
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                {name === 'pin' && <p className="text-xs text-muted-foreground">{t('pin.hint')}</p>}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('resetPin.saving') : t('resetPin.submit')}
        </Button>
      </form>
    </Form>
  );
}
