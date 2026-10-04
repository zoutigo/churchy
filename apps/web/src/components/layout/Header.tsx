'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
import { useRouter } from '@/i18n/link';
import { ChevronDown, Church, LogOut } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const initials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

export function Header() {
  const t = useTranslations('layout');
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-churchy-200 bg-white flex items-center justify-end gap-3 px-4 sm:px-6 shrink-0 shadow-sm">
      <LanguageSwitcher />
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('userMenu')}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-churchy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-churchy-500 text-xs font-semibold text-white"
            >
              {initials(user.firstName, user.lastName)}
            </span>
            <span className="font-medium text-churchy-700">
              {user.firstName} {user.lastName}
            </span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-0.5">
              <p className="font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
              {!user.emailVerified && (
                <p className="text-xs font-normal text-amber-600">{t('emailUnverified')}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/parishes" className="cursor-pointer">
                <Church size={15} className="mr-2" />
                {t('myParishes')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer">
              <LogOut size={15} className="mr-2" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
