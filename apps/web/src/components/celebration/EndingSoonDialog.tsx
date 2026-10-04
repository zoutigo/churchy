'use client';
import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/i18n/locale';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/link';
import type { CelebrationListItem } from '@churchy/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateLong } from '@/lib/format';

interface Props {
  parishId: string;
  timezone: string;
  celebrations: CelebrationListItem[];
}

const storageKey = (parishId: string) => `churchy:ending-soon:${parishId}`;

/** Rappel déjà vu pour cet ensemble de séries pendant cette session : on ne le répète pas à chaque page. */
function signature(items: CelebrationListItem[]) {
  return items
    .map((c) => `${c.id}@${c.lastOccurrenceAt}`)
    .sort()
    .join('|');
}

/**
 * Message box de rappel : une série dont la dernière date approche (moins d'un mois) doit être prolongée.
 * Affichée une fois par session et par état de séries ; « Plus tard » la ferme sans rien modifier.
 */
export function EndingSoonDialog({ parishId, timezone, celebrations }: Props) {
  const t = useTranslations('endingSoon');
  const locale = useAppLocale();
  const ending = celebrations.filter((c) => c.endingSoon);
  const [open, setOpen] = useState(false);
  const sig = signature(ending);

  useEffect(() => {
    if (ending.length === 0) return;
    try {
      if (window.sessionStorage.getItem(storageKey(parishId)) === sig) return;
    } catch {
      // stockage indisponible (navigation privée) : on affiche le rappel
    }
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, parishId]);

  const close = () => {
    try {
      window.sessionStorage.setItem(storageKey(parishId), sig);
    } catch {
      // sans importance
    }
    setOpen(false);
  };

  if (ending.length === 0) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="ending-soon-dialog">
        <DialogHeader>
          <DialogTitle>
            {ending.length === 1 ? t('titleOne') : t('titleMany', { count: ending.length })}
          </DialogTitle>
          <DialogDescription>
            {ending.length === 1 ? t('descOne') : t('descMany')}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {ending.map((c) => (
            <li key={c.id} className="rounded-md border p-3">
              <p className="font-medium">{c.title}</p>
              <p className="text-sm text-muted-foreground">
                {t('lastDate', {
                  date: formatDateLong(c.lastOccurrenceAt!, { timeZone: timezone, locale }),
                })}
              </p>
              <Button asChild size="sm" className="mt-2" onClick={close}>
                <Link href={`/dashboard/parishes/${parishId}/celebrations/${c.id}?prolonger=1`}>
                  {t('extend')}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            {t('later')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
