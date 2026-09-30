'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { celebrationsApi } from '@/lib/api/celebrations.api';
import { CelebrationCard } from '@/components/celebration/CelebrationCard';
import { Button } from '@/components/ui/button';
import type { Celebration } from '@churchy/shared';

interface Props {
  params: { parishId: string };
}

export default function CelebrationsPage({ params }: Props) {
  const { parishId } = params;
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    celebrationsApi.findByParish(parishId).then(setCelebrations).finally(() => setLoading(false));
  }, [parishId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Célébrations</h1>
          <p className="text-muted-foreground">Gérez et publiez vos célébrations</p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/parishes/${parishId}/celebrations/new`}>
            + Nouvelle célébration
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : celebrations.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Aucune célébration pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {celebrations.map((c) => (
            <CelebrationCard key={c.id} celebration={c} parishId={parishId} />
          ))}
        </div>
      )}
    </div>
  );
}
