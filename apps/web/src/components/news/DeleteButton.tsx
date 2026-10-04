'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  label: string;
  onConfirm: () => Promise<void>;
}

/** Suppression en deux temps (sans boîte de dialogue du navigateur) : « Supprimer » puis « Confirmer ». */
export function DeleteButton({ label, onConfirm }: Props) {
  const t = useTranslations('deleteButton');
  const tc = useTranslations('common');
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!armed) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={t('deleteLabel', { label })}
        onClick={() => setArmed(true)}
      >
        {t('delete')}
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
        aria-label={t('confirmLabel', { label })}
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
        {t('confirm')}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setArmed(false)}>
        {tc('cancel')}
      </Button>
    </span>
  );
}
