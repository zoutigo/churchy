import { useTranslations } from 'next-intl';
import { NotFoundPage } from '@/components/errors/NotFoundPage';

export default function ParishNotFound() {
  const t = useTranslations('errors');
  return (
    <NotFoundPage
      title={t('parishNotFound.title')}
      message={t('parishNotFound.message')}
      primary={{ href: '/paroisses', label: t('searchParish') }}
      secondary={{ href: '/', label: t('backHome') }}
    />
  );
}
