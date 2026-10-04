'use client';
import { Home } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
import { usePathname } from '@/i18n/link';
import { cn } from '@/lib/utils';

/** Sous-navigation d'une paroisse : défilement horizontal sur mobile, onglets complets sur desktop. */
export function ParishTabs({ parishId }: { parishId: string }) {
  const t = useTranslations('parishTabs');
  const pathname = usePathname();
  const base = `/paroisses/${parishId}`;
  const tabs = [
    { href: base, label: t('home'), exact: true, icon: true },
    { href: `${base}/messes`, label: t('masses') },
    { href: `${base}/calendrier`, label: t('calendar') },
    { href: `${base}/annonces`, label: t('announcements') },
    { href: `${base}/activites`, label: t('activities') },
  ];

  return (
    <nav aria-label={t('label')} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-0 sm:min-w-max sm:gap-1">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center border-b-2 px-1.5 text-[13px] max-[360px]:text-[11px] font-medium transition-colors sm:px-4 sm:text-sm',
                  active
                    ? 'border-amber-500 text-white'
                    : 'border-transparent text-churchy-100/75 hover:text-white',
                )}
              >
                {tab.icon && <Home size={18} aria-hidden className="sm:hidden" />}
                <span className={tab.icon ? 'sr-only sm:not-sr-only' : undefined}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
