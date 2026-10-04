'use client';
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
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Impossible de charger les données'),
      )
      .finally(() => setLoading(false));
  }, [parishId]);

  const active = celebrations.filter((c) => !c.archivedAt);
  const archived = celebrations.filter((c) => c.archivedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Célébrations"
        description="Séries de célébrations, leurs dates et leurs feuilles de préparation"
        action={
          <Button asChild>
            <Link href={`/dashboard/parishes/${parishId}/celebrations/new`}>
              + Nouvelle célébration
            </Link>
          </Button>
        }
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : celebrations.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Aucune célébration pour l&apos;instant.
        </p>
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
                Archivées ({archived.length})
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
