'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth.api';
import { handleSubmitError, errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { ProofField, emptyProof, proofKindOf, proofShape } from './proof';

type AnyValues = Record<string, string>;

/** Preuve (mot de passe ou PIN) avant de lier ou délier Google. */
function ProofForm({
  submitLabel,
  onSubmit,
  destructive = false,
}: {
  submitLabel: string;
  onSubmit: (proof: AnyValues) => Promise<void>;
  destructive?: boolean;
}) {
  const { user } = useAuth();
  const kind = proofKindOf(user!.methods);
  const schema = useMemo(() => z.object(proofShape(kind)), [kind]);
  const form = useForm<AnyValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyProof(kind),
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          try {
            await onSubmit(data);
          } catch (err: unknown) {
            handleSubmitError(form, err, submitLabel);
          }
        })}
        className="space-y-4"
        noValidate
      >
        <ProofField kind={kind} />
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button
          type="submit"
          variant={destructive ? 'outline' : 'default'}
          disabled={form.formState.isSubmitting}
        >
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}

/** Lier ou délier le compte Google. */
export function GoogleCard() {
  const t = useTranslations('security.google');
  const { user, applyUser } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    authApi
      .providers()
      .then((p) => alive && setClientId(p.google?.clientId ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!user || !clientId) return null;
  const linked = user.methods.google;
  const only = linked && !user.methods.password && !user.methods.pin;

  return (
    <Card data-testid="card-google">
      <CardHeader>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <CardDescription>{t('desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linked ? (
          <>
            <p className="flex items-center gap-2 text-sm text-churchy-500">
              <CheckCircle2 size={14} aria-hidden /> {t('linked')}
            </p>
            {only ? (
              <p className="text-sm text-muted-foreground">{t('onlyMethod')}</p>
            ) : (
              <ProofForm
                destructive
                submitLabel={t('unlink')}
                onSubmit={async (proof) => {
                  applyUser(await authApi.unlinkGoogle(proof as never));
                  notify.success(t('unlinked'));
                }}
              />
            )}
          </>
        ) : idToken ? (
          <div className="space-y-3">
            <p className="text-sm">{t('confirm')}</p>
            <ProofForm
              submitLabel={t('link')}
              onSubmit={async (proof) => {
                applyUser(await authApi.linkGoogle({ idToken, ...proof } as never));
                setIdToken(null);
                notify.success(t('linkedToast'));
              }}
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => setIdToken(null)}>
              {t('cancel')}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t('none')}</p>
            <GoogleSignInButton
              clientId={clientId}
              text="continue_with"
              onCredential={(token) => {
                try {
                  setIdToken(token);
                } catch (err) {
                  notify.error(t('error'), errorMessage(err, t('error')));
                }
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
