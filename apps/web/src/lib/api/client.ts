import { SESSION_EXPIRED_EVENT } from '@/lib/auth/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3201/api';

/**
 * Rendu serveur : si `API_INTERNAL_URL` est défini (réseau Docker), l'API est jointe directement, sans
 * repasser par le reverse proxy public. Le navigateur utilise toujours l'URL publique.
 */
const apiUrl = () =>
  typeof window === 'undefined' ? (process.env.API_INTERNAL_URL ?? API_URL) : API_URL;

/** Erreur renvoyée par l'API, avec son code HTTP. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Erreurs de validation de l'API par champ (schéma Zod côté serveur). */
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * L'API renvoie { statusCode, message } où `message` est soit une chaîne, soit l'objet de
 * l'exception Nest ({ message, error, statusCode }), soit l'erreur Zod ({ fieldErrors }).
 */
function extractMessage(body: { message?: unknown }): string {
  const m = body?.message;
  if (typeof m === 'string') return m;
  if (m && typeof m === 'object') {
    const { message, fieldErrors } = m as {
      message?: string | string[];
      fieldErrors?: Record<string, string[]>;
    };
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    const first = fieldErrors && Object.values(fieldErrors).flat()[0];
    if (first) return first;
  }
  return 'Erreur inconnue';
}

/** Erreurs par champ renvoyées par la validation Zod de l'API (`flatten()`), sinon un objet vide. */
function extractFieldErrors(body: { message?: unknown }): Record<string, string[]> {
  const m = body?.message;
  if (!m || typeof m !== 'object') return {};
  const { fieldErrors } = m as { fieldErrors?: Record<string, unknown> };
  if (!fieldErrors || typeof fieldErrors !== 'object') return {};
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (e): e is [string, string[]] => Array.isArray(e[1]) && e[1].length > 0,
    ),
  );
}

/** Routes pour lesquelles un 401 est une réponse normale : inutile (ou impossible) de rafraîchir. */
const NO_REFRESH = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
]);

let refreshInFlight: Promise<boolean> | null = null;

/** Renouvelle la session via le cookie de refresh. Un seul appel à la fois, partagé entre requêtes. */
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function request<T>(path: string, options?: RequestInit, canRetry = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      // Rendu serveur (pages publiques) : Next met les `fetch` en cache par défaut ; une annonce supprimée
      // doit disparaître immédiatement, donc jamais de copie en cache.
      ...(typeof window === 'undefined' ? { cache: 'no-store' as const } : {}),
      ...options,
      // Les jetons sont dans des cookies httpOnly : le navigateur les joint, le JavaScript ne les voit pas.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion.', 0);
  }

  if (res.status === 401 && canRetry && !NO_REFRESH.has(path) && typeof window !== 'undefined') {
    if (await refreshSession()) return request<T>(path, options, false);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new ApiError(extractMessage(error), res.status, extractFieldErrors(error));
  }

  // Une suppression réussie peut répondre sans corps : ne pas échouer sur un JSON vide.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
