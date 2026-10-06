import { AuthGuard } from '@/components/auth/AuthGuard';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlatformGuard } from '@/components/platform/PlatformGuard';

/** Espace plateforme : même charpente que le tableau de bord, accessible aux seuls rôles de plateforme. */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PlatformGuard>
        <div className="flex h-screen overflow-hidden">
          <Sidebar area="platform" />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <MobileNav area="platform" />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/30">
              <EmailVerificationBanner />
              {children}
            </main>
          </div>
        </div>
      </PlatformGuard>
    </AuthGuard>
  );
}
