import { CheckCircle2, Clock } from 'lucide-react';
import type { SheetStatus } from '@churchy/shared';
import { SHEET_STATUS_LABELS } from '@/lib/format';

export function SheetStatusBadge({ status }: { status: SheetStatus }) {
  const available = status === 'AVAILABLE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        available ? 'bg-churchy-200 text-churchy-700' : 'bg-amber-400/20 text-amber-600'
      }`}
    >
      {available ? <CheckCircle2 size={14} aria-hidden /> : <Clock size={14} aria-hidden />}
      {SHEET_STATUS_LABELS[status]}
    </span>
  );
}
