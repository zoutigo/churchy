'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
import { usePathname } from '@/i18n/link';
import { LayoutDashboard, Church, ShieldCheck, Star, UserCog } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', key: 'dashboard', exact: true, icon: LayoutDashboard },
  { href: '/dashboard/parishes', key: 'parishes', exact: false, icon: Church },
  { href: '/favoris', key: 'favorites', exact: false, icon: Star },
  { href: '/dashboard/security', key: 'security', exact: false, icon: ShieldCheck },
  {
    href: '/dashboard/admin/pin-reset',
    key: 'pinReset',
    exact: false,
    icon: UserCog,
    platformOnly: true,
  },
] as const;

type NavItem = {
  href: string;
  key: string;
  exact: boolean;
  icon: typeof Church;
  platformOnly?: boolean;
};

/** Entrées de navigation du tableau de bord visibles par l'utilisateur (partagées avec la barre mobile). */
export function useDashboardNav(): NavItem[] {
  const { user } = useAuth();
  return (navItems as readonly NavItem[]).filter(
    (item) => !item.platformOnly || user?.role === 'SUPER_ADMIN',
  );
}

export function Sidebar() {
  const t = useTranslations('layout.nav');
  const pathname = usePathname();
  const items = useDashboardNav();

  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-churchy-700 h-full flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-churchy-500/40">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <span className="text-churchy-300 text-lg">✦</span>
          <span className="font-playfair text-xl font-bold text-white tracking-wider">Churchy</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-churchy-500 text-white shadow-sm'
                  : 'text-churchy-200 hover:bg-churchy-500/50 hover:text-white',
              )}
            >
              <Icon size={16} strokeWidth={1.8} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      {/* Bottom decoration */}
      <div className="p-4 border-t border-churchy-500/40">
        <p className="text-xs text-churchy-300/60 text-center tracking-wider">CHURCHY</p>
      </div>
    </aside>
  );
}
