import { Link } from '@/i18n/link';
import { Church, MapPin } from 'lucide-react';
import type { PublicParishSummary } from '@churchy/shared';
import { formatDateShort, formatTime, placeLabel } from '@/lib/format';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { SheetStatusBadge } from './SheetStatusBadge';

export function ParishResultCard({ parish }: { parish: PublicParishSummary }) {
  const next = parish.nextCelebration;
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-churchy-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h2 className="font-playfair text-xl font-semibold text-churchy-700">{parish.name}</h2>
        <p className="flex items-center gap-1.5 text-sm text-churchy-900/80">
          <MapPin size={15} className="shrink-0 text-amber-500" aria-hidden />
          {placeLabel(parish)}
        </p>
        {parish.mainChurch && (
          <p className="flex items-center gap-1.5 text-sm text-churchy-900/80">
            <Church size={15} className="shrink-0 text-amber-500" aria-hidden />
            {parish.mainChurch}
          </p>
        )}
        {next && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-churchy-900">
            <span>
              Prochaine messe : {formatDateShort(next.date, { timeZone: next.timezone })} à{' '}
              {formatTime(next.date, { timeZone: next.timezone })}
            </span>
            <SheetStatusBadge status={next.sheetStatus} />
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <FavoriteButton parishId={parish.id} parishName={parish.name} variant="icon" />
        <Link
          href={`/paroisses/${parish.id}`}
          aria-label={`Voir la paroisse ${parish.name}`}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-churchy-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-churchy-700 sm:flex-none"
        >
          Voir la paroisse
        </Link>
      </div>
    </article>
  );
}
