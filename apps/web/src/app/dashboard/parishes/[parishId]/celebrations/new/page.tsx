'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/link';
import { DEFAULT_TIMEZONE } from '@churchy/shared';
import { useParish } from '@/hooks/useParish';
import { FormView } from '@/components/layout/FormView';
import { CelebrationForm } from '@/components/celebration/CelebrationForm';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string };
}

export default function NewCelebrationPage({ params }: Props) {
  const t = useTranslations('dashCelebrations');
  const tc = useTranslations('common');
  const { parishId } = params;
  const router = useRouter();
  const { parish, loading, error } = useParish(parishId);

  return (
    <FormView title={t('newTitle')} description={t('newDesc')} onBack={() => router.back()}>
      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">{tc('loadingShort')}</p>
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
