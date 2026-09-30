'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Church } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', exact: true, icon: LayoutDashboard },
  { href: '/dashboard/parishes', label: 'Paroisses', exact: false, icon: Church },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-churchy-700 h-full flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-churchy-500/40">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <span className="text-churchy-300 text-lg">✦</span>
          <span className="font-playfair text-xl font-bold text-white tracking-wider">Churchy</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
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
              {item.label}
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
