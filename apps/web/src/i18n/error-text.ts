import { useCallback } from 'react';
import { errorText } from '@churchy/shared';
import { useAppLocale } from './locale';

/** Traduit un message d'erreur de l'API ou d'un schéma (code stable) dans la langue de l'interface. */
export function useErrorText(): (message: string) => string {
  const locale = useAppLocale();
  return useCallback((message: string) => errorText(message, locale), [locale]);
}
