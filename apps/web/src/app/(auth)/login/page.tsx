import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-churchy-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-churchy-300 text-2xl">✦</span>
            <span className="font-playfair text-2xl font-bold text-churchy-700 tracking-wider">
              Churchy
            </span>
            <span className="text-churchy-300 text-2xl">✦</span>
          </div>
          <h1 className="font-playfair text-2xl font-bold text-churchy-700">Connexion</h1>
          <p className="text-sm text-muted-foreground">Accédez à votre espace Churchy</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-churchy-200 rounded-xl p-6 shadow-sm space-y-4">
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-churchy-500 hover:text-churchy-700 hover:underline font-medium">
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
