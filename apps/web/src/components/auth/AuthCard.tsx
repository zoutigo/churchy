import { Link } from '@/i18n/link';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Carte des pages d'authentification (connexion, inscription, mot de passe…) ; le cadre (en-tête, logo) vient du layout `(auth)`. */
export function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <div className="flex items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-playfair text-2xl font-bold text-churchy-700">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="bg-white border border-churchy-200 rounded-xl p-6 shadow-sm space-y-4">
          {children}
          {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
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
