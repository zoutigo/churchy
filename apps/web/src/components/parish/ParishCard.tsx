import Link from 'next/link';
import type { Parish } from '@churchy/shared';

interface Props {
  parish: Parish & { role?: string };
  href?: string;
}

export function ParishCard({ parish, href }: Props) {
  const target = href ?? `/dashboard/parishes/${parish.id}`;
  return (
    <Link href={target} className="block group">
      <div className="rounded-xl border border-churchy-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-churchy-300 transition-all space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-playfair font-semibold text-churchy-700 group-hover:text-churchy-500 transition-colors">
            {parish.name}
          </h3>
          {parish.role && (
            <span className="text-xs text-churchy-500 bg-churchy-200 px-2 py-0.5 rounded-full shrink-0 font-medium">
              {parish.role}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <span className="text-amber-500">✦</span>
          {parish.city}, {parish.country}
        </p>
        {parish.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{parish.description}</p>
        )}
      </div>
    </Link>
  );
}
