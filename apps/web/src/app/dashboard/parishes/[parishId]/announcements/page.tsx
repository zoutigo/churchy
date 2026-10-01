'use client';
import { useCallback, useEffect, useState } from 'react';
import { announcementsApi, type Announcement } from '@/lib/api/announcements.api';
import { CreateAnnouncementForm } from '@/components/news/CreateAnnouncementForm';
import { DeleteButton } from '@/components/news/DeleteButton';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Annonces</h1>
          <p className="text-muted-foreground">
            Informations publiées sur la page publique de la paroisse
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouvelle annonce'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-4 sm:p-6 max-w-2xl">
          <h2 className="font-semibold mb-4">Nouvelle annonce</h2>
          <CreateAnnouncementForm
            parishId={parishId}
            onSuccess={() => {
              setShowForm(false);
              void load();
            }}
          />
        </div>
      )}

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Aucune annonce pour l’instant.</p>
      ) : (
        <ul className="space-y-3">
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
