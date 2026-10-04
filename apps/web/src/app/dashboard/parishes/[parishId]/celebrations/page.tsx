'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/link';
import { DEFAULT_TIMEZONE, type CelebrationListItem } from '@churchy/shared';
import { celebrationsApi } from '@/lib/api/celebrations.api';
import { useParish } from '@/hooks/useParish';
import { CelebrationCard } from '@/components/celebration/CelebrationCard';
import { EndingSoonDialog } from '@/components/celebration/EndingSoonDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string };
}

export default function CelebrationsPage({ params }: Props) {
  const t = useTranslations('dashCelebrations');
  const td = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { parishId } = params;
  const { parish } = useParish(parishId);
  const timezone = parish?.timezone ?? DEFAULT_TIMEZONE;
  const [celebrations, setCelebrations] = useState<CelebrationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    celebrationsApi
      .findByParish(parishId)
      .then(setCelebrations)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : td('loadError')))
      .finally(() => setLoading(false));
  }, [parishId, td]);

  const active = celebrations.filter((c) => !c.archivedAt);
  const archived = celebrations.filter((c) => c.archivedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('desc')}
        action={
          <Button asChild>
            <Link href={`/dashboard/parishes/${parishId}/celebrations/new`}>{t('new')}</Link>
          </Button>
        }
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : celebrations.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t('empty')}</p>
      ) : (
        <>
          <EndingSoonDialog parishId={parishId} timezone={timezone} celebrations={active} />
          <div className="grid gap-3 lg:grid-cols-2">
            {active.map((c) => (
              <CelebrationCard key={c.id} celebration={c} parishId={parishId} timezone={timezone} />
            ))}
          </div>
          {archived.length > 0 && (
            <details className="space-y-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                {t('archived', { count: archived.length })}
              </summary>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {archived.map((c) => (
                  <CelebrationCard
                    key={c.id}
                    celebration={c}
                    parishId={parishId}
                    timezone={timezone}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
