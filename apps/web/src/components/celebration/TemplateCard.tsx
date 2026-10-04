'use client';
import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CELEBRATION_TYPE_LABELS } from '@/lib/format';
import type { TemplateWithSteps } from '@/lib/api/celebrations.api';
import { DeleteButton } from '@/components/news/DeleteButton';
import { Button } from '@/components/ui/button';

interface Props {
  template: TemplateWithSteps;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

/** Modèle de feuille replié par défaut : titre + sous-titre, un bouton déplie les étapes, Modifier, Supprimer. */
export function TemplateCard({ template, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const steps = template.steps ?? [];

  return (
    <div className="rounded-lg border bg-card" data-testid="template-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg p-4 text-left hover:bg-muted/50"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{template.name}</span>
          <span className="block text-xs text-muted-foreground">
            {CELEBRATION_TYPE_LABELS[template.type]} — {steps.length} étape
            {steps.length > 1 ? 's' : ''}
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
        <span className="sr-only">{open ? 'Replier' : 'Déplier'}</span>
      </button>

      {open && (
        <div id={panelId} className="space-y-3 border-t px-4 pb-4 pt-3">
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
          {steps.length > 0 ? (
            <ol className="list-decimal space-y-0.5 pl-5 text-sm">
              {steps.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune étape.</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Modifier ${template.name}`}
              onClick={onEdit}
            >
              Modifier
            </Button>
            <DeleteButton label={template.name} onConfirm={onDelete} />
          </div>
        </div>
      )}
    </div>
  );
}
