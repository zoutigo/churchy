'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { authApi } from '@/lib/api/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Rappelle de confirmer l'adresse email tant qu'elle ne l'est pas. */
export function EmailVerificationBanner() {
  const t = useTranslations('auth.banner');
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('idle');

  if (!user || user.emailVerified) return null;

  async function resend() {
    setStatus('sending');
    try {
      await authApi.resendVerification();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Alert variant="warning" className="mb-6">
      <MailWarning size={16} />
      <AlertTitle>{t('title')}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>
          {t.rich('sentTo', { email: user.email, strong: (chunks) => <strong>{chunks}</strong> })}
        </span>
        {status === 'sent' ? (
          <span role="status" className="font-medium">
            {t('resent')}
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={resend}
            disabled={status === 'sending'}
          >
            {status === 'sending' ? t('sending') : t('resend')}
          </Button>
        )}
        {status === 'error' && (
          <span role="alert" className="text-destructive">
            {t('error')}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
