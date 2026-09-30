'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="h-14 border-b border-churchy-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {user && (
          <>
            <User size={15} className="text-churchy-500" />
            <span className="font-medium text-churchy-700">
              {user.firstName} {user.lastName}
            </span>
          </>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-muted-foreground hover:text-churchy-700 hover:bg-churchy-50 gap-2"
      >
        <LogOut size={15} />
        Se déconnecter
      </Button>
    </header>
  );
}
