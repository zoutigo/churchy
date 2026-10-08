'use client';
import { Link } from '@/i18n/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { handlePageError } from '@/lib/client-errors';
import { ErrorPage, errorButtonClass, errorSecondaryButtonClass } from './ErrorPage';

interface Props {
  error?: Error & { digest?: string };
  reset: () => void;
  size?: 'page' | 'inline';
  home?: { href: string; label: string };
}

/** Panne inattendue : « Réessayer » relance le rendu, le lien ramène en lieu sûr. L'erreur reste dans la console. */
export function ServerErrorPage({ error, reset, size, home }: Props) {
  const t = useTranslations('errors');
  const exit = home ?? { href: '/', label: t('backHome') };
  useEffect(() => {
    if (!error) return;
    console.error(error);
    handlePageError(error, 'segment');
  }, [error]);

  return (
    <ErrorPage
      kind="server"
      code="500"
      title={t('server.title')}
      message={t('server.message')}
      size={size}
    >
      <button type="button" onClick={reset} className={errorButtonClass}>
        {t('server.retry')}
      </button>
      <Link href={exit.href} className={errorSecondaryButtonClass}>
        {exit.label}
      </Link>
    </ErrorPage>
  );
}
