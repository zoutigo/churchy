'use client';
import { useCallback, useEffect, useState } from 'react';
import { templatesApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { CELEBRATION_TYPE_LABELS } from '@/lib/format';
import { errorMessage } from '@/lib/forms/submit-error';
import { TemplateForm } from '@/components/celebration/TemplateForm';
import { FormView } from '@/components/layout/FormView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string };
}

export default function TemplatesPage({ params }: Props) {
  const { parishId } = params;
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    templatesApi
      .findByParish(parishId)
      .then(setTemplates)
      .catch((err: unknown) => setError(errorMessage(err, 'Impossible de charger les données')))
      .finally(() => setLoading(false));
  }, [parishId]);

  useEffect(load, [load]);

  if (creating) {
    return (
      <FormView
        title="Nouveau modèle"
        description="Les étapes de la feuille de préparation, dans l’ordre"
        onBack={() => setCreating(false)}
      >
        <TemplateForm
          parishId={parishId}
          onCancel={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            load();
          }}
        />
      </FormView>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modèles de feuille"
        description="Définissez le déroulement de vos célébrations"
        action={<Button onClick={() => setCreating(true)}>+ Nouveau modèle</Button>}
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : templates.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Aucun modèle pour l&apos;instant.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border bg-card p-4" data-testid="template-card">
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {CELEBRATION_TYPE_LABELS[t.type]} — {t.steps?.length ?? 0} étapes
              </p>
              {t.steps && t.steps.length > 0 && (
                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-muted-foreground">
                  {t.steps.map((s) => (
                    <li key={s.id}>{s.title}</li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
