'use client';
import { useState, useEffect, useCallback } from 'react';
import { contentsApi } from '@/lib/api/contents.api';
import { CreateContentForm } from '@/components/content/CreateContentForm';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';
import type { Content } from '@churchy/shared';

interface Props {
  params: { parishId: string };
}

export default function ContentsPage({ params }: Props) {
  const { parishId } = params;
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    contentsApi
      .findByParish(parishId)
      .then(setContents)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Impossible de charger les données'),
      )
      .finally(() => setLoading(false));
  }, [parishId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bibliothèque de contenus</h1>
          <p className="text-muted-foreground">Chants, lectures, prières et plus</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Ajouter un contenu'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-6 max-w-lg">
          <h2 className="font-semibold mb-4">Nouveau contenu</h2>
          <CreateContentForm
            parishId={parishId}
            onSuccess={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : contents.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          Aucun contenu pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-2">
          {contents.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border bg-card p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
