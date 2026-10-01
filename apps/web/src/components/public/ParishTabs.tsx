'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Sous-navigation d'une paroisse : défilement horizontal sur mobile, onglets complets sur desktop. */
export function ParishTabs({ parishId }: { parishId: string }) {
  const pathname = usePathname();
  const base = `/paroisses/${parishId}`;
  const tabs = [
    { href: base, label: 'Accueil', exact: true },
    { href: `${base}/messes`, label: 'Messes' },
    { href: `${base}/annonces`, label: 'Annonces' },
    { href: `${base}/activites`, label: 'Activités' },
  ];

  return (
    <nav aria-label="Pages de la paroisse" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center border-b-2 px-4 text-sm font-medium transition-colors',
                  active
                    ? 'border-amber-500 text-white'
                    : 'border-transparent text-churchy-100/75 hover:text-white',
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
