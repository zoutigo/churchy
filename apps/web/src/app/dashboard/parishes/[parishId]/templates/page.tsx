'use client';
import { useCallback, useEffect, useState } from 'react';
import { templatesApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { TemplateCard } from '@/components/celebration/TemplateCard';
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
  const [editing, setEditing] = useState<TemplateWithSteps | null>(null);

  const load = useCallback(() => {
    templatesApi
      .findByParish(parishId)
      .then(setTemplates)
      .catch((err: unknown) => setError(errorMessage(err, 'Impossible de charger les données')))
      .finally(() => setLoading(false));
  }, [parishId]);

  useEffect(load, [load]);

  if (creating || editing) {
    const close = () => {
      setCreating(false);
      setEditing(null);
    };
    return (
      <FormView
        title={editing ? `Modifier « ${editing.name} »` : 'Nouveau modèle'}
        description={
          editing
            ? 'Les feuilles déjà préparées gardent leurs étapes'
            : 'Les étapes de la feuille de préparation, dans l’ordre'
        }
        onBack={close}
      >
        <TemplateForm
          parishId={parishId}
          template={editing ?? undefined}
          onCancel={close}
          onDone={() => {
            close();
            load();
          }}
        />
      </FormView>
    );
  }

  async function remove(t: TemplateWithSteps) {
    try {
      await templatesApi.remove(t.id);
      setTemplates((list) => list.filter((x) => x.id !== t.id));
      notify.success('Modèle supprimé', t.name);
    } catch (err) {
      notify.error('Erreur lors de la suppression', errorMessage(err, 'Suppression impossible'));
    }
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
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => setEditing(t)}
              onDelete={() => remove(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
