'use client';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { ERR, addEmailSchema, setPasswordSchema } from '@churchy/shared';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth.api';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
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
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ProofField, emptyProof, proofKindOf, proofShape } from './proof';

type AnyValues = Record<string, string>;

function AddEmailForm() {
  const t = useTranslations('security.email');
  const { user, applyUser } = useAuth();
  const kind = proofKindOf(user!.methods);
  const schema = useMemo(
    () => z.object({ email: addEmailSchema.shape.email, ...proofShape(kind) }),
    [kind],
  );
  const form = useForm<AnyValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', ...emptyProof(kind) },
    mode: 'onChange',
  });

  async function onSubmit(data: AnyValues) {
    try {
      applyUser(await authApi.addEmail(data as never));
      notify.success(t('added'), t('addedText'));
    } catch (err: unknown) {
      handleSubmitError(form, err, t('addError'));
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
              <FormLabel>{t('label')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="vous@paroisse.fr"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <ProofField kind={kind} />
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('adding') : t('add')}
        </Button>
      </form>
    </Form>
  );
}

function PasswordForm() {
  const t = useTranslations('security.password');
  const tAuth = useTranslations('auth');
  const { user, applyUser } = useAuth();
  const kind = proofKindOf(user!.methods);
  const schema = useMemo(
    () =>
      z
        .object({
          password: setPasswordSchema.shape.password,
          confirmPassword: z.string().min(1, ERR.confirmPasswordRequired),
          ...proofShape(kind),
        })
        .refine((d) => d.password === d.confirmPassword, {
          path: ['confirmPassword'],
          message: ERR.passwordsMismatch,
        }),
    [kind],
  );
  const form = useForm<AnyValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '', ...emptyProof(kind) },
    mode: 'onChange',
  });
  const hasPassword = user!.methods.password;

  async function onSubmit({ confirmPassword: _confirm, ...data }: AnyValues) {
    try {
      const res = await authApi.setPassword(data as never);
      applyUser(res.user);
      notify.success(hasPassword ? t('changed') : t('created'), t('sessionsNote'));
      form.reset({
        password: '',
        confirmPassword: '',
        ...emptyProof(proofKindOf(res.user.methods)),
      });
    } catch (err: unknown) {
      handleSubmitError(form, err, t('error'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <ProofField kind={kind} />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{hasPassword ? t('new') : tAuth('password')}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder={tAuth('passwordHint')}
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
              <FormLabel>{tAuth('confirmPassword')}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
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
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('saving') : hasPassword ? t('change') : t('create')}
        </Button>
      </form>
    </Form>
  );
}

/** Email du compte (à ajouter pour un compte par téléphone) et mot de passe. */
export function EmailPasswordCard() {
  const t = useTranslations('security');
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Card data-testid="card-email-password">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail size={18} aria-hidden /> {t('email.title')}
        </CardTitle>
        <CardDescription>{t('email.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {user.email ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{user.email}</span>
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-churchy-500">
                <CheckCircle2 size={14} aria-hidden /> {t('email.verified')}
              </span>
            ) : (
              <span className="text-amber-600">{t('email.unverified')}</span>
            )}
          </p>
        ) : (
          <AddEmailForm />
        )}

        <div className="space-y-3 border-t border-churchy-200 pt-5">
          <h3 className="flex items-center gap-2 font-medium">
            <KeyRound size={16} aria-hidden /> {t('password.title')}
          </h3>
          {user.email ? (
            <>
              <p className="text-sm text-muted-foreground">
                {user.methods.password ? t('password.has') : t('password.none')}
              </p>
              <PasswordForm />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('password.needEmail')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
