import { Search } from 'lucide-react';
import { useLocale } from 'next-intl';
import { localizeHref } from '@/i18n/paths';
import { isLocale, DEFAULT_LOCALE } from '@/i18n/routing';

interface Props {
  /** Identifiant unique du champ (la landing affiche deux formulaires). */
  id: string;
  defaultValue?: string;
  /** `hero` : très grand, sur fond sombre ; `compact` : barre de page de résultats. */
  size?: 'hero' | 'compact';
}

/**
 * Recherche de paroisse. Simple formulaire GET vers /paroisses : fonctionne sans JavaScript,
 * et la requête reste dans l'URL (partageable, bouton retour).
 */
export function ParishSearchForm({ id, defaultValue = '', size = 'hero' }: Props) {
  const big = size === 'hero';
  const raw = useLocale();
  const action = localizeHref(isLocale(raw) ? raw : DEFAULT_LOCALE, '/paroisses');
  return (
    <form action={action} method="get" role="search" className="w-full">
      <label htmlFor={id} className="sr-only">
        Rechercher une paroisse, une ville ou un quartier
      </label>
      <div
        className={`flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg shadow-churchy-900/10 sm:flex-row sm:items-center ${
          big ? '' : 'border border-churchy-200 shadow-none'
        }`}
      >
        <div className="flex flex-1 items-center gap-3 px-3">
          <Search className="shrink-0 text-churchy-300" size={big ? 22 : 18} aria-hidden />
          <input
            id={id}
            name="q"
            type="search"
            defaultValue={defaultValue}
            maxLength={100}
            autoComplete="off"
            placeholder="Rechercher une paroisse, une ville ou un quartier"
            className={`w-full min-w-0 bg-transparent text-churchy-900 placeholder:text-churchy-900/45 focus:outline-none ${
              big ? 'h-14 text-base sm:text-lg' : 'h-11 text-base'
            }`}
          />
        </div>
        <button
          type="submit"
          className={`rounded-xl bg-amber-500 font-semibold text-white transition-colors hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
            big ? 'h-14 px-8 text-base' : 'h-11 px-6 text-sm'
          }`}
        >
          Rechercher
        </button>
      </div>
    </form>
  );
}
