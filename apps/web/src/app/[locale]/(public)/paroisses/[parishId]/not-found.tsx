'use client';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { NotFoundPage } from '@/components/errors/NotFoundPage';

export default function ParishPageNotFound() {
  const t = useTranslations('errors');
  const { parishId } = useParams<{ parishId: string }>();
  return (
    <NotFoundPage
      size="inline"
      message={t('parishPageNotFound.message')}
      primary={{ href: `/paroisses/${parishId}`, label: t('parishPageNotFound.back') }}
      secondary={{ href: '/paroisses', label: t('searchParish') }}
    />
  );
}
