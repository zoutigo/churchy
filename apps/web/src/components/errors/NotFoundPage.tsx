import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
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
export function NotFoundPage({ title, message, size, primary, secondary }: Props) {
  const t = useTranslations('errors');
  const main = primary ?? { href: '/', label: t('backHome') };
  return (
    <ErrorPage
      kind="not-found"
      code="404"
      title={title ?? t('notFound.title')}
      message={message ?? t('notFound.message')}
      size={size}
    >
      <Link href={main.href} className={errorButtonClass}>
        {main.label}
      </Link>
      {secondary && (
        <Link href={secondary.href} className={errorSecondaryButtonClass}>
          {secondary.label}
        </Link>
      )}
    </ErrorPage>
  );
}
