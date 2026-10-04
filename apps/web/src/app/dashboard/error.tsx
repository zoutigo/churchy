'use client';
import { useTranslations } from 'next-intl';
import { ServerErrorPage } from '@/components/errors/ServerErrorPage';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  return (
    <ServerErrorPage
      error={error}
      reset={reset}
      size="inline"
      home={{ href: '/dashboard', label: t('dashboard') }}
    />
  );
}
