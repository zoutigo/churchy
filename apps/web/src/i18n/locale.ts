import { useLocale } from 'next-intl';
import { DEFAULT_LOCALE, isLocale, type Locale } from './routing';

/** Langue courante, toujours une langue gérée (français si la valeur est inattendue). */
export function useAppLocale(): Locale {
  const locale = useLocale();
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}
