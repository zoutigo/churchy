import { AuthGuard } from '@/components/auth/AuthGuard';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <EmailVerificationBanner />
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
