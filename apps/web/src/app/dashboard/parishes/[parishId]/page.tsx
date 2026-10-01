'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useParish } from '@/hooks/useParish';
import { ParishInfoForm } from '@/components/parish/ParishInfoForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string };
}

const sections = [
  { path: 'contents', title: 'Bibliothèque', text: 'Chants, psaumes, lectures, prières' },
  { path: 'templates', title: 'Modèles', text: 'Modèles de célébration' },
  { path: 'celebrations', title: 'Célébrations', text: 'Préparer et publier les messes' },
  { path: 'announcements', title: 'Annonces', text: 'Informations pour les fidèles' },
  { path: 'activities', title: 'Activités', text: 'Rencontres et événements' },
];

export default function ParishDetailPage({ params }: Props) {
  const { parishId } = params;
  const { parish, error } = useParish(parishId);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{parish?.name ?? 'Paroisse'}</h1>
        <Link
          href={`/paroisses/${parishId}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm font-medium text-churchy-500 hover:underline"
        >
          Voir la page publique <ExternalLink size={14} aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.path}
            href={`/dashboard/parishes/${parishId}/${s.path}`}
            className="block rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold">{s.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{s.text}</p>
          </Link>
        ))}
      </div>

      <section
        className="rounded-lg border bg-card p-4 sm:p-6 max-w-3xl space-y-4"
        aria-labelledby="public-info"
      >
        <div>
          <h2 id="public-info" className="font-semibold">
            Informations publiques
          </h2>
          <p className="text-sm text-muted-foreground">
            Affichées sur la page de la paroisse et dans les résultats de recherche.
          </p>
        </div>
        {error ? (
          <ErrorNotice message={error} />
        ) : parish ? (
          <>
            {saved && (
              <Alert variant="success">
                <AlertDescription>Informations enregistrées.</AlertDescription>
              </Alert>
            )}
            <ParishInfoForm parish={parish} onSaved={() => setSaved(true)} />
          </>
        ) : (
          <p className="text-muted-foreground">Chargement...</p>
        )}
      </section>
    </div>
  );
}
