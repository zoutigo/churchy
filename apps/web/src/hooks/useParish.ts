'use client';
import { useCallback, useEffect, useState } from 'react';
import { parishesApi } from '@/lib/api/parishes.api';
import type { Parish } from '@churchy/shared';

const messageOf = (err: unknown) =>
  err instanceof Error ? err.message : 'Impossible de charger les données';

export function useMyParishes() {
  const [parishes, setParishes] = useState<(Parish & { role: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    return parishesApi
      .findMine()
      .then(setParishes)
      .catch((err: unknown) => setError(messageOf(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { parishes, loading, error, refresh: load };
}

export function useParish(id: string) {
  const [parish, setParish] = useState<Parish | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    parishesApi
      .findById(id)
      .then(setParish)
      .catch((err: unknown) => setError(messageOf(err)))
      .finally(() => setLoading(false));
  }, [id]);

  return { parish, loading, error, setParish };
}
