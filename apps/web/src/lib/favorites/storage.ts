import { MAX_FAVORITE_PARISHES } from '@churchy/shared';

/** Clé du `localStorage` : favoris d'un visiteur non connecté (ids de paroisses, dans l'ordre d'ajout). */
export const FAVORITES_KEY = 'churchy:favorites';

/** Lit les favoris de l'appareil. Tolère l'absence de stockage et tout contenu corrompu. */
export function readLocalFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
    return [...new Set(ids)].slice(0, MAX_FAVORITE_PARISHES);
  } catch {
    return [];
  }
}

export function writeLocalFavorites(ids: string[]): void {
  try {
    if (ids.length === 0) localStorage.removeItem(FAVORITES_KEY);
    else localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // Stockage indisponible (navigation privée, quota) : les favoris restent valables pour la page en cours.
  }
}

export const clearLocalFavorites = () => writeLocalFavorites([]);
