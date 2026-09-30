'use client';
import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { authApi } from '@/lib/api/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Rappelle de confirmer l'adresse email tant qu'elle ne l'est pas. */
export function EmailVerificationBanner() {
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
      <AlertTitle>Confirmez votre adresse email</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>
          Nous avons envoyé un lien à <strong>{user.email}</strong>.
        </span>
        {status === 'sent' ? (
          <span role="status" className="font-medium">
            Un nouveau lien vient d&apos;être envoyé.
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={resend}
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Envoi...' : 'Renvoyer le lien'}
          </Button>
        )}
        {status === 'error' && (
          <span role="alert" className="text-destructive">
            Envoi impossible, réessayez dans un instant.
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
