import { useTranslations } from 'next-intl';
import { NotFoundPage } from '@/components/errors/NotFoundPage';

export default function PlatformNotFound() {
  const t = useTranslations('errors');
  return (
    <NotFoundPage
      size="inline"
      message={t('platformNotFound.message')}
      primary={{ href: '/platform', label: t('platform') }}
      secondary={{ href: '/dashboard', label: t('dashboard') }}
    />
  );
}
