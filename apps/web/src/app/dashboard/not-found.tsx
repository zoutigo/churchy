import { useTranslations } from 'next-intl';
import { NotFoundPage } from '@/components/errors/NotFoundPage';

export default function DashboardNotFound() {
  const t = useTranslations('errors');
  return (
    <NotFoundPage
      size="inline"
      message={t('dashboardNotFound.message')}
      primary={{ href: '/dashboard', label: t('dashboard') }}
      secondary={{ href: '/dashboard/parishes', label: t('myParishes') }}
    />
  );
}
