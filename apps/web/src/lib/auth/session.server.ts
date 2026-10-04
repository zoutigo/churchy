import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './session';

/** Rendu serveur : vrai si la requête porte le cookie indicateur de session (jamais de secret). */
export function serverHasSession(): boolean {
  return cookies().get(SESSION_COOKIE)?.value === '1';
}
