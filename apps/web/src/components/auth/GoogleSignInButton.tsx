'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/i18n/locale';
import { loadGoogleIdentity } from '@/lib/auth/google-identity';

interface Props {
  clientId: string;
  /** Reçoit le jeton d'identité signé par Google (vérifié ensuite par l'API). */
  onCredential: (idToken: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

/** Bouton officiel de Google : son rendu (logo, langue) est imposé par Google. */
export function GoogleSignInButton({ clientId, onCredential, text = 'continue_with' }: Props) {
  const t = useTranslations('auth.google');
  const locale = useAppLocale();
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !container.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) callback.current(response.credential);
          },
          ux_mode: 'popup',
        });
        google.accounts.id.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          locale,
          width: Math.min(Math.round(container.current.offsetWidth) || 320, 400),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, locale, text]);

  if (failed) {
    return (
      <p role="status" className="text-center text-xs text-muted-foreground">
        {t('unavailable')}
      </p>
    );
  }
  return (
    <div ref={container} data-testid="google-button" className="flex min-h-[44px] justify-center" />
  );
}
