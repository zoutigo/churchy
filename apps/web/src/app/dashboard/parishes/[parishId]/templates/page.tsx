'use client';
import { useState, useEffect } from 'react';
import type { CelebrationTemplate, CelebrationTemplateStep } from '@churchy/shared';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';

type TemplateWithSteps = CelebrationTemplate & { steps?: CelebrationTemplateStep[] };

interface Props {
  params: { parishId: string };
}

export default function TemplatesPage({ params }: Props) {
  const { parishId } = params;
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<TemplateWithSteps[]>(`/parishes/${parishId}/templates`)
      .then(setTemplates)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Impossible de charger les données'),
      )
      .finally(() => setLoading(false));
  }, [parishId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modèles de célébration</h1>
          <p className="text-muted-foreground">Définissez le déroulement de vos célébrations</p>
        </div>
        <Button>+ Nouveau modèle</Button>
      </div>

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : templates.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Aucun modèle pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border bg-card p-4">
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {t.type} — {t.steps?.length ?? 0} étapes
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
