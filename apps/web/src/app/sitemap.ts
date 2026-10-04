import type { MetadataRoute } from 'next';
import { publicApi } from '@/lib/api/public.api';
import { SITE_URL } from '@/lib/site';
import { parishPaths, sitemapEntries, STATIC_PATHS } from '@/lib/sitemap';

// Les paroisses changent : le plan du site est généré à la demande, pas figé au build.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
/** Garde-fou : chaque paroisse pèse 10 URL (5 pages × 2 langues) et un plan est limité à 50 000. */
const MAX_PARISHES = 4000;

async function parishIds(): Promise<string[]> {
  const ids: string[] = [];
  try {
    for (let page = 1; ids.length < MAX_PARISHES; page++) {
      const result = await publicApi.searchParishes(undefined, page, PAGE_SIZE);
      ids.push(...result.items.map((p) => p.id));
      if (result.items.length < PAGE_SIZE || ids.length >= result.total) break;
    }
  } catch {
    // API injoignable : on publie au moins les pages statiques plutôt qu'une erreur.
  }
  return ids.slice(0, MAX_PARISHES);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ids = await parishIds();
  return sitemapEntries(SITE_URL, [...STATIC_PATHS, ...ids.flatMap(parishPaths)]);
}
