'use client';
import { ServerErrorPage } from '@/components/errors/ServerErrorPage';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ServerErrorPage error={error} reset={reset} />;
}
