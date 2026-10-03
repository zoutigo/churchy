'use client';
import { useState } from 'react';
import { useMyParishes } from '@/hooks/useParish';
import { ParishCard } from '@/components/parish/ParishCard';
import { CreateParishForm } from '@/components/parish/CreateParishForm';
import { FormView } from '@/components/layout/FormView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';

export default function ParishesPage() {
  const { parishes, loading, error, refresh } = useMyParishes();
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <FormView
        title="Créer une paroisse"
        description="Ces informations alimentent la page publique de la paroisse"
        onBack={() => setShowForm(false)}
      >
        <CreateParishForm
          onSuccess={() => {
            setShowForm(false);
            refresh();
          }}
        />
      </FormView>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes paroisses"
        description="Gérez vos espaces paroissiaux"
        action={<Button onClick={() => setShowForm(true)}>+ Nouvelle paroisse</Button>}
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : parishes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucune paroisse pour l&apos;instant.</p>
          <p className="text-sm mt-1">Créez votre première paroisse ci-dessus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parishes.map((p) => (
            <ParishCard key={p.id} parish={p} />
          ))}
        </div>
      )}
    </div>
  );
}
