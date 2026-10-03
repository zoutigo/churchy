'use client';
import { useState, useEffect, useCallback } from 'react';
import { contentsApi } from '@/lib/api/contents.api';
import { CreateContentForm } from '@/components/content/CreateContentForm';
import { FormView } from '@/components/layout/FormView';
import { PageHeader } from '@/components/layout/PageHeader';
import { CONTENT_TYPE_LABELS } from '@/components/content/content-labels';
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

  if (showForm) {
    return (
      <FormView
        title="Nouveau contenu"
        description="Chant, lecture, prière… réutilisable dans vos célébrations"
        onBack={() => setShowForm(false)}
      >
        <CreateContentForm
          parishId={parishId}
          onSuccess={() => {
            setShowForm(false);
            load();
          }}
        />
      </FormView>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bibliothèque de contenus"
        description="Chants, lectures, prières et plus"
        action={<Button onClick={() => setShowForm(true)}>+ Ajouter un contenu</Button>}
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : contents.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          Aucun contenu pour l&apos;instant.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {contents.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4"
            >
              <p className="min-w-0 truncate font-medium">{c.title}</p>
              <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {CONTENT_TYPE_LABELS[c.type as keyof typeof CONTENT_TYPE_LABELS] ?? c.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
