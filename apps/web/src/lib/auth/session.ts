/** Cookie posé par l'API (valeur « 1 », aucun secret) : indique qu'une session existe. */
export const SESSION_COOKIE = 'churchy_session';

/** Événement émis quand la session ne peut plus être renouvelée (refresh token expiré ou révoqué). */
export const SESSION_EXPIRED_EVENT = 'churchy:session-expired';

/** Vrai si le navigateur porte un cookie de session. Permet d'éviter d'appeler l'API pour un anonyme. */
export function hasSessionFlag(
  cookies: string = typeof document === 'undefined' ? '' : document.cookie,
): boolean {
  return cookies.split(';').some((c) => c.trim() === `${SESSION_COOKIE}=1`);
}

/**
 * Valide la destination de redirection après connexion (`?next=`). Seuls les chemins relatifs du
 * site sont acceptés : tout le reste (URL absolue, `//evil.com`, `/\evil.com`) retombe sur `fallback`,
 * pour qu'un lien piégé ne puisse pas rediriger vers un site tiers (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\'))
    return fallback;
  return next;
}
