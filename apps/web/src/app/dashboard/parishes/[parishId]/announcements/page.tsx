'use client';
import { useCallback, useEffect, useState } from 'react';
import { announcementsApi, type Announcement } from '@/lib/api/announcements.api';
import { CreateAnnouncementForm } from '@/components/news/CreateAnnouncementForm';
import { DeleteButton } from '@/components/news/DeleteButton';
import { FormView } from '@/components/layout/FormView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';
import { formatDateLong } from '@/lib/format';

interface Props {
  params: { parishId: string };
}

export default function Page({ params }: Props) {
  const { parishId } = params;
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setError(null);
    return announcementsApi
      .findByParish(parishId)
      .then(setItems)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Impossible de charger les données'),
      )
      .finally(() => setLoading(false));
  }, [parishId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (showForm) {
    return (
      <FormView
        title="Nouvelle annonce"
        description="Visible sur la page publique de la paroisse"
        onBack={() => setShowForm(false)}
      >
        <CreateAnnouncementForm
          parishId={parishId}
          onSuccess={() => {
            setShowForm(false);
            void load();
          }}
        />
      </FormView>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Annonces"
        description="Informations publiées sur la page publique de la paroisse"
        action={<Button onClick={() => setShowForm(true)}>+ Nouvelle annonce</Button>}
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Aucune annonce pour l’instant.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{formatDateLong(item.publishedAt)}</p>
              </div>
              <DeleteButton
                label={item.title}
                onConfirm={async () => {
                  try {
                    await announcementsApi.remove(parishId, item.id);
                    await load();
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Suppression impossible');
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
