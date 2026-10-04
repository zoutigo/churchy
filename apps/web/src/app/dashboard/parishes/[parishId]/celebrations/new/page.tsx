'use client';
import { useRouter } from 'next/navigation';
import { DEFAULT_TIMEZONE } from '@churchy/shared';
import { useParish } from '@/hooks/useParish';
import { FormView } from '@/components/layout/FormView';
import { CelebrationForm } from '@/components/celebration/CelebrationForm';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string };
}

export default function NewCelebrationPage({ params }: Props) {
  const { parishId } = params;
  const router = useRouter();
  const { parish, loading, error } = useParish(parishId);

  return (
    <FormView
      title="Nouvelle célébration"
      description="Une ou plusieurs dates : la feuille de préparation se crée ensuite, pour chaque date"
      onBack={() => router.back()}
    >
      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <CelebrationForm
          parishId={parishId}
          timezone={parish?.timezone ?? DEFAULT_TIMEZONE}
          onDone={(c) => router.push(`/dashboard/parishes/${parishId}/celebrations/${c.id}`)}
          onCancel={() => router.back()}
        />
      )}
    </FormView>
  );
}
