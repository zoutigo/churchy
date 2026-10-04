import { useTranslations } from 'next-intl';
import { SheetStatusBadge } from './SheetStatusBadge';

/**
 * Illustration : une feuille de célébration (papier au coin plié). C'est l'image du concept de
 * Churchy ; son contenu est un exemple, pas une vraie donnée.
 */
export function SheetCard({ className = '' }: { className?: string }) {
  const t = useTranslations('sheetCard');
  return (
    <figure className={`sheet-shadow ${className}`} aria-label={t('label')}>
      <div className="sheet bg-white px-6 pb-6 pt-7 text-churchy-900">
        <p className="font-playfair text-2xl font-bold text-churchy-700">{t('when')}</p>
        <p className="mt-1 text-base">{t('title')}</p>
        <div className="my-4 space-y-2" aria-hidden>
          <div className="h-2 w-5/6 rounded bg-churchy-100" />
          <div className="h-2 w-2/3 rounded bg-churchy-100" />
          <div className="h-2 w-3/4 rounded bg-churchy-100" />
        </div>
        <SheetStatusBadge status="AVAILABLE" />
      </div>
    </figure>
  );
}
