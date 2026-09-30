import Link from 'next/link';
import type { Celebration } from '@churchy/shared';
import { CelebrationStatus } from '@churchy/shared';

const STATUS_STYLES: Record<CelebrationStatus, string> = {
  [CelebrationStatus.DRAFT]: 'bg-churchy-100 text-churchy-700 border border-churchy-200',
  [CelebrationStatus.PUBLISHED]: 'bg-churchy-200 text-churchy-700 border border-churchy-300',
  [CelebrationStatus.ARCHIVED]: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const STATUS_LABELS: Record<CelebrationStatus, string> = {
  [CelebrationStatus.DRAFT]: 'Brouillon',
  [CelebrationStatus.PUBLISHED]: 'Publiée',
  [CelebrationStatus.ARCHIVED]: 'Archivée',
};

interface Props {
  celebration: Celebration;
  parishId?: string;
}

export function CelebrationCard({ celebration, parishId }: Props) {
  const href = parishId
    ? `/dashboard/parishes/${parishId}/celebrations/${celebration.id}`
    : `/celebrations/${celebration.id}`;

  const date = new Date(celebration.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link href={href} className="block group">
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex">
        {/* Accent bar gauche */}
        <div className="w-1 shrink-0 bg-churchy-500 group-hover:bg-amber-500 transition-colors" />
        <div className="flex items-start justify-between gap-2 p-4 flex-1">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-playfair font-semibold text-churchy-700 truncate group-hover:text-churchy-500 transition-colors">
              {celebration.title}
            </h3>
            <p className="text-sm font-medium text-amber-500">{date}</p>
            {celebration.location && (
              <p className="text-xs text-muted-foreground">{celebration.location}</p>
            )}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[celebration.status as CelebrationStatus]}`}
          >
            {STATUS_LABELS[celebration.status as CelebrationStatus]}
          </span>
        </div>
      </div>
    </Link>
  );
}
