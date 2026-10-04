'use client';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Vue « formulaire » d'une page du tableau de bord : elle remplace la liste tant qu'on saisit (mobile,
 * tablette et desktop), avec un retour explicite. La carte est centrée et large : les champs longs
 * (texte riche) profitent de la place, les champs courts se rangent en colonnes.
 */
export function FormView({
  title,
  description,
  onBack,
  children,
}: {
  title: string;
  description?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-3 h-10 gap-2 text-muted-foreground sm:h-9"
          onClick={onBack}
        >
          <ArrowLeft size={16} aria-hidden /> Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
