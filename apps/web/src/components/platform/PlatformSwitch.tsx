'use client';
import { useTranslations } from 'next-intl';
import { Church, ShieldCheck } from 'lucide-react';
import { hasPlatformPermission } from '@churchy/shared';
import { usePathname, useRouter } from '@/i18n/link';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

/** Vrai dans l'espace plateforme (`/platform…`) : le mode se déduit de l'URL, rien n'est mémorisé. */
export const isPlatformPath = (pathname: string) =>
  pathname === '/platform' || pathname.startsWith('/platform/');

/**
 * Interrupteur « Mon espace | Plateforme », visible pour qui a un rôle de plateforme (jamais pour un compte
 * ordinaire). Il bascule entre `/platform` et `/dashboard`.
 */
export function PlatformSwitch() {
  const t = useTranslations('platform.switch');
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user || !hasPlatformPermission(user.role, 'platform.access')) return null;
  const onPlatform = isPlatformPath(pathname);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={onPlatform}
      aria-label={t('aria')}
      onClick={() => router.push(onPlatform ? '/dashboard' : '/platform')}
      className="flex h-10 items-center rounded-full border border-churchy-200 bg-churchy-50 p-0.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-full px-2.5 transition-colors sm:px-3',
          !onPlatform ? 'bg-churchy-500 text-white shadow-sm' : 'text-churchy-700',
        )}
      >
        <Church size={14} aria-hidden />
        <span className="hidden sm:inline">{t('mine')}</span>
      </span>
      <span
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-full px-2.5 transition-colors sm:px-3',
          onPlatform ? 'bg-amber-500 text-white shadow-sm' : 'text-churchy-700',
        )}
      >
        <ShieldCheck size={14} aria-hidden />
        <span className="hidden sm:inline">{t('platform')}</span>
      </span>
    </button>
  );
}
