import type { ClientErrorDto } from '@churchy/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3201/api';
const RELOAD_KEY = 'churchy:stale-reload';
const RELOAD_WINDOW_MS = 60_000;

/**
 * Fichier JavaScript introuvable : la page date d'avant un déploiement (ses fichiers n'existent plus) ou
 * le réseau a coupé pendant le chargement. Messages selon le navigateur (Chrome, Safari, Firefox).
 */
export function isChunkLoadError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  if (!e) return false;
  return (
    e.name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unexpected token '<'/i.test(
      e.message ?? '',
    )
  );
}

/**
 * Recharge la page **une seule fois** (par minute) pour récupérer la version à jour. Sans stockage
 * disponible, on ne recharge pas : impossible de se souvenir qu'on l'a déjà fait, donc risque de boucle.
 */
export function reloadOnceForStaleBuild(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

const reported = new Set<string>();

/** Envoie l'erreur à l'API (journal). Jamais d'exception : signaler ne doit pas aggraver la panne. */
export function reportClientError(
  error: (Error & { digest?: string }) | undefined,
  source: ClientErrorDto['source'],
): void {
  try {
    const message = String(error?.message ?? 'Erreur inconnue').slice(0, 500);
    const key = `${source}:${message}`;
    if (reported.has(key)) return;
    reported.add(key);
    const body: ClientErrorDto = {
      message,
      source,
      stack: error?.stack?.slice(0, 4000),
      digest: error?.digest?.slice(0, 100),
      path: window.location.pathname.slice(0, 300),
      userAgent: navigator.userAgent.slice(0, 300),
    };
    void fetch(`${API_URL}/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Rien à faire : le visiteur voit déjà la page d'erreur.
  }
}

/**
 * Appelé par les pages d'erreur : fichier périmé → rechargement automatique (le visiteur ne voit rien) ;
 * sinon l'erreur est signalée. Renvoie vrai si la page se recharge.
 */
export function handlePageError(
  error: (Error & { digest?: string }) | undefined,
  source: ClientErrorDto['source'],
): boolean {
  if (isChunkLoadError(error) && reloadOnceForStaleBuild()) return true;
  reportClientError(error, source);
  return false;
}
