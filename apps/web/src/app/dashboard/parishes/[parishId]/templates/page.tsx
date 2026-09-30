'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

interface Props {
  params: { parishId: string };
}

export default function TemplatesPage({ params }: Props) {
  const { parishId } = params;
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>(`/parishes/${parishId}/templates`)
      .then(setTemplates)
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

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : templates.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Aucun modèle pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((t: any) => (
            <div key={t.id} className="rounded-lg border bg-card p-4">
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.type} — {t.steps?.length ?? 0} étapes</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
