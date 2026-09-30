'use client';
import { useState, useEffect } from 'react';
import { parishesApi } from '@/lib/api/parishes.api';
import type { Parish } from '@churchy/shared';

export function useMyParishes() {
  const [parishes, setParishes] = useState<(Parish & { role: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parishesApi.findMine()
      .then(setParishes)
      .finally(() => setLoading(false));
  }, []);

  return { parishes, loading, refresh: () => parishesApi.findMine().then(setParishes) };
}

export function useParish(id: string) {
  const [parish, setParish] = useState<Parish | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    parishesApi.findById(id)
      .then(setParish)
      .finally(() => setLoading(false));
  }, [id]);

  return { parish, loading };
}
