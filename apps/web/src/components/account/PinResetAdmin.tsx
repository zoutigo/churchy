'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, ShieldAlert } from 'lucide-react';
import { adminPinResetSchema, hasPlatformPermission, type PinResetLinkDto } from '@churchy/shared';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth.api';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { PhoneNumberField } from '@/components/auth/PhoneNumberField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppLocale } from '@/i18n/locale';
import { formatDateTimeLong } from '@/lib/format';

interface Values {
  phone: string;
}

/**
 * Administrateurs de la plateforme : remet un lien de réinitialisation de PIN à une personne qui ne peut pas le
 * faire seule (compte sans email). À transmettre après avoir vérifié son identité.
 */
export function PinResetAdmin() {
  const t = useTranslations('admin.pinReset');
  const locale = useAppLocale();
  const { user } = useAuth();
  const [link, setLink] = useState<PinResetLinkDto | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(adminPinResetSchema),
    defaultValues: { phone: '' },
    mode: 'onChange',
  });

  if (!user) return null;
  if (!hasPlatformPermission(user.role, 'platform.pin-reset')) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-xl">
        <ShieldAlert size={16} />
        <AlertDescription>{t('forbidden')}</AlertDescription>
      </Alert>
    );
  }

  async function onSubmit(data: Values) {
    try {
      setLink(await authApi.adminPinResetLink(data));
      notify.success(t('created'));
    } catch (err: unknown) {
      setLink(null);
      handleSubmitError(form, err, t('error'));
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      notify.success(t('copied'));
    } catch {
      notify.error(t('copyFailed'));
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="border-b border-churchy-200 pb-5">
        <h1 className="font-playfair text-3xl font-bold text-churchy-700">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('formTitle')}</CardTitle>
          <CardDescription>{t('formDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <PhoneNumberField />
              {form.formState.errors.root && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t('creating') : t('create')}
              </Button>
            </form>
          </Form>

          {link && (
            <div
              className="space-y-3 rounded-lg border border-churchy-200 bg-churchy-50 p-4"
              data-testid="pin-reset-result"
            >
              <p className="text-sm">
                {t.rich('result', {
                  name: `${link.firstName} ${link.lastName}`,
                  date: formatDateTimeLong(link.expiresAt, { locale }),
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={link.url}
                  aria-label={t('linkLabel')}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button type="button" variant="outline" onClick={() => copy(link.url)}>
                  <Copy size={15} className="mr-2" aria-hidden />
                  {t('copy')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('warning')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
