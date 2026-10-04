import Link from 'next/link';
import { ErrorPage, errorButtonClass, errorSecondaryButtonClass } from './ErrorPage';

interface Props {
  title?: string;
  message?: string;
  size?: 'page' | 'inline';
  /** Lien principal ; par défaut l'accueil du site. */
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}

/** « Page introuvable » : même rendu partout, seuls les liens de sortie changent selon l'endroit. */
export function NotFoundPage({
  title = 'Page introuvable',
  message = 'Cette page n’existe pas ou n’est plus disponible. Le lien est peut-être erroné ou a été déplacé.',
  size,
  primary = { href: '/', label: 'Retour à l’accueil' },
  secondary,
}: Props) {
  return (
    <ErrorPage kind="not-found" code="404" title={title} message={message} size={size}>
      <Link href={primary.href} className={errorButtonClass}>
        {primary.label}
      </Link>
      {secondary && (
        <Link href={secondary.href} className={errorSecondaryButtonClass}>
          {secondary.label}
        </Link>
      )}
    </ErrorPage>
  );
}
