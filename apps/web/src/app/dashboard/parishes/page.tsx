'use client';
import { useState } from 'react';
import { useMyParishes } from '@/hooks/useParish';
import { ParishCard } from '@/components/parish/ParishCard';
import { CreateParishForm } from '@/components/parish/CreateParishForm';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';

export default function ParishesPage() {
  const { parishes, loading, error, refresh } = useMyParishes();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes paroisses</h1>
          <p className="text-muted-foreground">Gérez vos espaces paroissiaux</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouvelle paroisse'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-6 max-w-lg">
          <h2 className="font-semibold mb-4">Créer une paroisse</h2>
          <CreateParishForm
            onSuccess={() => {
              setShowForm(false);
              refresh();
            }}
          />
        </div>
      )}

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
