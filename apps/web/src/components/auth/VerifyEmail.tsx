'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { AuthLink } from '@/components/auth/AuthCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/link';

type Status = 'loading' | 'success' | 'error';

/** Valide le lien reçu par email dès l'ouverture de la page. */
export function VerifyEmail({ token }: { token: string | undefined }) {
  const t = useTranslations('auth.verify');
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : t('missingToken'));
  // Le jeton est à usage unique : en mode strict, React exécute l'effet deux fois en développement.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verifyEmail({ token })
      .then(() => {
        setStatus('success');
        // Si l'utilisateur est connecté, on met à jour son profil (la bannière disparaît).
        void refreshUser();
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : t('invalidLink'));
      });
  }, [token, refreshUser, t]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="animate-spin" size={16} />
        {t('loading')}
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <CheckCircle2 size={16} />
          <AlertTitle>{t('successTitle')}</AlertTitle>
          <AlertDescription>{t('successText')}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/dashboard">{t('goSpace')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <XCircle size={16} />
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <p className="text-center text-sm text-muted-foreground">
        {t.rich('loginHint', {
          link: (chunks) => <AuthLink href="/login?next=/dashboard">{chunks}</AuthLink>,
        })}
      </p>
    </div>
  );
}
