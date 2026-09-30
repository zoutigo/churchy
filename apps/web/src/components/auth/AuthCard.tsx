import Link from 'next/link';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Cadre commun des pages d'authentification (connexion, inscription, mot de passe…). */
export function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-churchy-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="flex items-center justify-center gap-2 mb-3">
            <span className="text-churchy-300 text-2xl">✦</span>
            <span className="font-playfair text-2xl font-bold text-churchy-700 tracking-wider">
              Churchy
            </span>
            <span className="text-churchy-300 text-2xl">✦</span>
          </Link>
          <h1 className="font-playfair text-2xl font-bold text-churchy-700">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="bg-white border border-churchy-200 rounded-xl p-6 shadow-sm space-y-4">
          {children}
          {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-churchy-500 hover:text-churchy-700 hover:underline font-medium"
    >
      {children}
    </Link>
  );
}
