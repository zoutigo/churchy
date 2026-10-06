'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { parishesApi } from '@/lib/api/parishes.api';
import type { Parish, ParishDuty, ParishStatus } from '@churchy/shared';

const messageOf = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export function useMyParishes() {
  const t = useTranslations('dashboard');
  const [parishes, setParishes] = useState<
    (Parish & { status: ParishStatus; duties: ParishDuty[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    return parishesApi
      .findMine()
      .then(setParishes)
      .catch((err: unknown) => setError(messageOf(err, t('loadError'))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return { parishes, loading, error, refresh: load };
}

export function useParish(id: string) {
  const t = useTranslations('dashboard');
  const [parish, setParish] = useState<Parish | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    parishesApi
      .findById(id)
      .then(setParish)
      .catch((err: unknown) => setError(messageOf(err, t('loadError'))))
      .finally(() => setLoading(false));
  }, [id, t]);

  return { parish, loading, error, setParish };
}
