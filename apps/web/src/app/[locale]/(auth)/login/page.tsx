import { CheckCircle2, Clock } from 'lucide-react';
import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { safeNextPath } from '@/lib/auth/session';

interface Props {
  searchParams: { next?: string; expired?: string; reset?: string };
}

export default function LoginPage({ searchParams }: Props) {
  return (
    <AuthCard
      title="Connexion"
      subtitle="Accédez à votre espace Churchy"
      footer={
        <>
          Pas encore de compte ? <AuthLink href="/register">S&apos;inscrire</AuthLink>
        </>
      }
    >
      {searchParams.expired && (
        <Alert variant="warning">
          <Clock size={16} />
          <AlertDescription>
            Votre session a expiré. Reconnectez-vous pour continuer.
          </AlertDescription>
        </Alert>
      )}
      {searchParams.reset && (
        <Alert variant="success">
          <CheckCircle2 size={16} />
          <AlertDescription>
            Mot de passe modifié. Vous pouvez maintenant vous connecter.
          </AlertDescription>
        </Alert>
      )}
      <LoginForm next={safeNextPath(searchParams.next)} />
    </AuthCard>
  );
}
