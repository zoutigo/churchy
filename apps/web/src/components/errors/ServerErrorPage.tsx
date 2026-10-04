'use client';
import { Link } from '@/i18n/link';
import { useEffect } from 'react';
import { ErrorPage, errorButtonClass, errorSecondaryButtonClass } from './ErrorPage';

interface Props {
  error?: Error & { digest?: string };
  reset: () => void;
  size?: 'page' | 'inline';
  home?: { href: string; label: string };
}

/** Panne inattendue : « Réessayer » relance le rendu, le lien ramène en lieu sûr. L'erreur reste dans la console. */
export function ServerErrorPage({
  error,
  reset,
  size,
  home = { href: '/', label: 'Retour à l’accueil' },
}: Props) {
  useEffect(() => {
    if (error) console.error(error);
  }, [error]);

  return (
    <ErrorPage
      kind="server"
      code="500"
      title="Un problème est survenu"
      message="Nous n’avons pas pu afficher cette page. Cela vient de nous, pas de vous : réessayez dans un instant."
      size={size}
    >
      <button type="button" onClick={reset} className={errorButtonClass}>
        Réessayer
      </button>
      <Link href={home.href} className={errorSecondaryButtonClass}>
        {home.label}
      </Link>
    </ErrorPage>
  );
}
