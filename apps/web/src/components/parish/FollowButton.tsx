'use client';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserCheck } from 'lucide-react';
import { ParishStatus, type ParishMembershipDto } from '@churchy/shared';
import { Link } from '@/i18n/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parishesApi } from '@/lib/api/parishes.api';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

interface Props {
  parishId: string;
  parishName: string;
  className?: string;
}

const BUTTON =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors disabled:opacity-60';
const OUTLINE = 'border-churchy-200 bg-white text-churchy-700 hover:bg-churchy-100';

/**
 * Devenir fidèle d'une paroisse (sans validation) ou s'en retirer. Un visiteur est envoyé se connecter,
 * puis revient sur la paroisse. L'administrateur verra le nom et le prénom du compte : la boîte de
 * dialogue le dit avant de confirmer.
 */
export function FollowButton({ parishId, parishName, className }: Props) {
  const t = useTranslations('follow');
  const { user, initializing } = useAuth();
  const [membership, setMembership] = useState<ParishMembershipDto | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setMembership(undefined);
      return;
    }
    let cancelled = false;
    parishesApi
      .membership(parishId)
      .then((m) => !cancelled && setMembership(m))
      .catch(() => !cancelled && setMembership(null));
    return () => {
      cancelled = true;
    };
  }, [user, parishId]);

  const follow = useCallback(async () => {
    setBusy(true);
    try {
      setMembership(await parishesApi.follow(parishId));
      setOpen(false);
      notify.success(t('done', { name: parishName }));
    } catch (err: unknown) {
      notify.error(t('error'), errorMessage(err, t('error')));
    } finally {
      setBusy(false);
    }
  }, [parishId, parishName, t]);

  const leave = useCallback(async () => {
    setBusy(true);
    try {
      const res = await parishesApi.leave(parishId);
      setMembership(res.membership ?? { status: null, duties: [] });
      notify.success(
        res.membership ? t('steppedDown', { name: parishName }) : t('left', { name: parishName }),
      );
    } catch (err: unknown) {
      notify.error(t('error'), errorMessage(err, t('error')));
    } finally {
      setBusy(false);
    }
  }, [parishId, parishName, t]);

  if (initializing) return null;

  if (!user) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/paroisses/${parishId}`)}`}
        className={cn(BUTTON, OUTLINE, className)}
      >
        <UserCheck size={18} aria-hidden /> {t('login')}
      </Link>
    );
  }
  if (membership === undefined) return null;

  const status = membership?.status ?? null;

  if (status === null) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(BUTTON, OUTLINE, className)}
        >
          <UserCheck size={18} aria-hidden /> {t('become')}
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dialogTitle', { name: parishName })}</DialogTitle>
              <DialogDescription>{t('dialogIntro')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p>{t('visibleName', { name: `${user.firstName} ${user.lastName}` })}</p>
              <p>
                {t.rich('privacy', {
                  link: (chunks) => (
                    <Link href="/confidentialite" className="font-medium underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="button" disabled={busy} onClick={follow}>
                {t('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const label =
    status === ParishStatus.PARISH_ADMIN
      ? t('admin')
      : status === ParishStatus.PARISHIONER
        ? t('member')
        : t('following');

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      <span className={cn(BUTTON, 'border-emerald-300 bg-emerald-50 text-emerald-900')}>
        <UserCheck size={18} aria-hidden /> {label}
      </span>
      {status !== ParishStatus.PARISH_ADMIN && (
        <button type="button" disabled={busy} onClick={leave} className={cn(BUTTON, OUTLINE)}>
          {status === ParishStatus.PARISHIONER ? t('stepDown') : t('unfollow')}
        </button>
      )}
    </span>
  );
}
