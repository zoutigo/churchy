import { useTranslations } from 'next-intl';
import { PublicShell } from '@/components/layout/PublicShell';
import { NotFoundPage } from '@/components/errors/NotFoundPage';

export default function NotFound() {
  const t = useTranslations('errors');
  return (
    <PublicShell>
      <NotFoundPage secondary={{ href: '/paroisses', label: t('findParish') }} />
    </PublicShell>
  );
}
