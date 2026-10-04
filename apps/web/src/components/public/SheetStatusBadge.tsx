import { CheckCircle2 } from 'lucide-react';
import type { SheetStatus } from '@churchy/shared';
import { useLabels } from '@/i18n/labels';

/** Le public ne voit que « feuille disponible » : une feuille en préparation n'est pas mentionnée. */
export function SheetStatusBadge({ status }: { status: SheetStatus }) {
  const labels = useLabels();
  if (status !== 'AVAILABLE') return null;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-churchy-200 px-2.5 py-1 text-xs font-medium text-churchy-700">
      <CheckCircle2 size={14} aria-hidden />
      {labels.sheetStatus(status)}
    </span>
  );
}
