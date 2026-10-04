import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { ERR, errorText } from '@churchy/shared';
import { ApiError } from '@/lib/api/client';
import { notify } from '@/lib/notify';

const currentLanguage = () =>
  typeof document === 'undefined' ? undefined : document.documentElement.lang;

/** Message lisible pour n'importe quelle erreur levée par un appel d'API. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Traite l'échec d'un envoi de formulaire, de façon identique partout :
 * - erreurs de validation de l'API (Zod côté serveur) → affichées sous les champs concernés ;
 * - toute autre erreur (403, 404, 409, 500, réseau…) → message général sous le formulaire (`root`) ;
 * - dans tous les cas, un toast d'erreur.
 */
export function handleSubmitError<T extends FieldValues>(
  form: UseFormReturn<T>,
  err: unknown,
  fallback: string,
): void {
  const known = new Set(Object.keys(form.getValues()));
  const fieldErrors = err instanceof ApiError ? err.fieldErrors : {};
  const mapped = Object.entries(fieldErrors).filter(([name]) => known.has(name));

  if (mapped.length > 0) {
    for (const [name, messages] of mapped) {
      form.setError(name as Path<T>, { type: 'server', message: messages[0] });
    }
    notify.error(fallback, errorText(ERR.fixFields, currentLanguage()));
    return;
  }
  const message = errorMessage(err, fallback);
  form.setError('root', { type: 'server', message });
  notify.error(fallback, message);
}
