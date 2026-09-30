const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3201/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('churchy_token');
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(extractMessage(error));
  }

  return res.json() as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
