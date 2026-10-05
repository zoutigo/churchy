'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { forgotPinSchema } from '@churchy/shared';
import { authApi } from '@/lib/api/auth.api';
import { PhoneNumberField } from '@/components/auth/PhoneNumberField';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';

interface Values {
  phone: string;
}

export function ForgotPinForm() {
  const t = useTranslations('auth.forgotPin');
  const [sent, setSent] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(forgotPinSchema),
    defaultValues: { phone: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: Values) {
    try {
      await authApi.forgotPin(data);
      notify.success(t('toast'));
      setSent(true);
    } catch (err: unknown) {
      handleSubmitError(form, err, t('errorFallback'));
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <MailCheck size={16} />
          <AlertTitle>{t('sentTitle')}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{t('sentText')}</p>
            <p className="text-sm">{t('noEmail')}</p>
          </AlertDescription>
        </Alert>
        <Button type="button" variant="outline" className="w-full" onClick={() => setSent(false)}>
          {t('another')}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <PhoneNumberField />
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  );
}
