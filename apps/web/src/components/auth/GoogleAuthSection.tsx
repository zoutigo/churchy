'use client';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/link';
import { useAppLocale } from '@/i18n/locale';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth.api';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { GoogleLinkDialog } from '@/components/auth/GoogleLinkDialog';

let providersPromise: ReturnType<typeof authApi.providers> | null = null;

/** Fournisseurs activés côté serveur (une seule requête par chargement de page). */
function useGoogleClientId(): string | null | undefined {
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    providersPromise ??= authApi.providers();
    providersPromise
      .then((p) => alive && setClientId(p.google?.clientId ?? null))
      .catch(() => {
        providersPromise = null;
        if (alive) setClientId(null);
      });
    return () => {
      alive = false;
    };
  }, []);
  return clientId;
}

export function resetGoogleProvidersForTests() {
  providersPromise = null;
}

interface Props {
  /** Destination après connexion (déjà validée par safeNextPath). */
  next?: string;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

/**
 * « Continuer avec Google » + séparateur « ou ». N'affiche rien tant que Google n'est pas configuré côté serveur.
 * Si un compte existe déjà avec la même adresse, on demande son mot de passe avant de lier (jamais de fusion silencieuse).
 */
export function GoogleAuthSection({ next = '/dashboard', text }: Props) {
  const t = useTranslations('auth.google');
  const router = useRouter();
  const locale = useAppLocale();
  const { loginGoogle } = useAuth();
  const clientId = useGoogleClientId();
  const [link, setLink] = useState<{ idToken: string; email: string } | null>(null);

  const onCredential = useCallback(
    async (idToken: string) => {
      try {
        const result = await loginGoogle({ idToken, locale });
        if ('linkRequired' in result) {
          setLink({ idToken, email: result.linkRequired });
          return;
        }
        router.push(next);
        router.refresh();
      } catch (err: unknown) {
        notify.error(t('error'), errorMessage(err, t('error')));
      }
    },
    [loginGoogle, locale, router, next, t],
  );

  if (!clientId) return null;

  return (
    <>
      <div className="space-y-4">
        <GoogleSignInButton clientId={clientId} onCredential={onCredential} text={text} />
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-churchy-200" />
          {t('or')}
          <span className="h-px flex-1 bg-churchy-200" />
        </div>
      </div>
      {link && (
        <GoogleLinkDialog
          idToken={link.idToken}
          email={link.email}
          next={next}
          onClose={() => setLink(null)}
        />
      )}
    </>
  );
}
