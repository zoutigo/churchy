'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  label: string;
  onConfirm: () => Promise<void>;
}

/** Suppression en deux temps (sans boîte de dialogue du navigateur) : « Supprimer » puis « Confirmer ». */
export function DeleteButton({ label, onConfirm }: Props) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!armed) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={`Supprimer ${label}`}
        onClick={() => setArmed(true)}
      >
        Supprimer
      </Button>
    );
  }
  return (
    <span className="flex gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={busy}
        aria-label={`Confirmer la suppression de ${label}`}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
      >
        Confirmer
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setArmed(false)}>
        Annuler
      </Button>
    </span>
  );
}
