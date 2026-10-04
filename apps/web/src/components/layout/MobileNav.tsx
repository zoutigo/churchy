'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
import { usePathname } from '@/i18n/link';
import { cn } from '@/lib/utils';
import { dashboardNav } from './Sidebar';

/** Navigation du tableau de bord sur mobile (la barre latérale n'apparaît qu'à partir de `md`). */
export function MobileNav() {
  const t = useTranslations('layout.nav');
  const pathname = usePathname();
  return (
    <nav
      aria-label={t('label')}
      className="flex gap-1 overflow-x-auto border-b border-churchy-200 bg-white px-3 md:hidden"
    >
      {dashboardNav.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium',
              active
                ? 'border-amber-500 text-churchy-700'
                : 'border-transparent text-churchy-900/70',
            )}
          >
            <Icon size={16} aria-hidden />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
