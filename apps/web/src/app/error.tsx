'use client';
import { PublicShell } from '@/components/layout/PublicShell';
import { ServerErrorPage } from '@/components/errors/ServerErrorPage';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PublicShell>
      <ServerErrorPage error={error} reset={reset} />
    </PublicShell>
  );
}
