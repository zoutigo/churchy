'use client';
import { ServerErrorPage } from '@/components/errors/ServerErrorPage';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ServerErrorPage
      error={error}
      reset={reset}
      size="inline"
      home={{ href: '/dashboard', label: 'Tableau de bord' }}
    />
  );
}
