'use client';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Smartphone } from 'lucide-react';
import { ERR, changePinSchema, formatInternationalPhone, setPhonePinSchema } from '@churchy/shared';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth.api';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { PhoneNumberField } from '@/components/auth/PhoneNumberField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PinInput } from '@/components/ui/pin-input';
import { ProofField, emptyProof, proofKindOf, proofShape } from './proof';

type AnyValues = Record<string, string>;

function PinField({ name, label, hint }: { name: string; label: string; hint?: string }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <PinInput
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value}
              onChange={field.onChange}
            />
          </FormControl>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function CreatePinForm() {
  const t = useTranslations('security.pin');
  const tAuth = useTranslations('auth.pin');
  const { user, applyUser } = useAuth();
  const kind = proofKindOf(user!.methods);
  const schema = useMemo(
    () =>
      z
        .object({
          phone: setPhonePinSchema.shape.phone,
          pin: setPhonePinSchema.shape.pin,
          confirmPin: z.string().min(1, ERR.confirmPinRequired),
          ...proofShape(kind),
        })
        .refine((d) => d.pin === d.confirmPin, { path: ['confirmPin'], message: ERR.pinsMismatch }),
    [kind],
  );
  const form = useForm<AnyValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', pin: '', confirmPin: '', ...emptyProof(kind) },
    mode: 'onChange',
  });

  async function onSubmit({ confirmPin: _confirm, ...data }: AnyValues) {
    try {
      applyUser((await authApi.setPhonePin(data as never)).user);
      notify.success(t('created'), t('createdText'));
    } catch (err: unknown) {
      handleSubmitError(form, err, t('createError'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <PhoneNumberField />
        <PinField name="pin" label={tAuth('label')} hint={tAuth('hint')} />
        <PinField name="confirmPin" label={tAuth('confirm')} />
        <ProofField kind={kind} />
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
  );
}

function ChangePinForm() {
  const t = useTranslations('security.pin');
  const tAuth = useTranslations('auth.pin');
  const { applyUser } = useAuth();
  const schema = useMemo(
    () =>
      z
        .object({
          currentPin: changePinSchema.shape.currentPin,
          pin: changePinSchema.shape.pin,
          confirmPin: z.string().min(1, ERR.confirmPinRequired),
        })
        .refine((d) => d.pin === d.confirmPin, { path: ['confirmPin'], message: ERR.pinsMismatch }),
    [],
  );
  const form = useForm<AnyValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPin: '', pin: '', confirmPin: '' },
    mode: 'onChange',
  });

  async function onSubmit({ confirmPin: _confirm, ...data }: AnyValues) {
    try {
      applyUser((await authApi.changePin(data as never)).user);
      notify.success(t('changed'), t('sessionsNote'));
      form.reset();
    } catch (err: unknown) {
      handleSubmitError(form, err, t('changeError'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <PinField name="currentPin" label={t('current')} />
        <PinField name="pin" label={t('new')} hint={tAuth('hint')} />
        <PinField name="confirmPin" label={tAuth('confirm')} />
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('saving') : t('change')}
        </Button>
      </form>
    </Form>
  );
}

/** Connexion par téléphone + PIN : l'ajouter à un compte email, ou changer son PIN. */
export function PhonePinCard() {
  const t = useTranslations('security.pin');
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Card data-testid="card-phone-pin">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone size={18} aria-hidden /> {t('title')}
        </CardTitle>
        <CardDescription>{t('desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user.phone ? (
          <>
            <p className="text-sm">
              {t('registered')}{' '}
              <span className="font-medium">{formatInternationalPhone(user.phone)}</span>
            </p>
            <ChangePinForm />
          </>
        ) : (
          <CreatePinForm />
        )}
      </CardContent>
    </Card>
  );
}
