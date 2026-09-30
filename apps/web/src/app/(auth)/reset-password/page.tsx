import { XCircle } from 'lucide-react';
import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  searchParams: { token?: string };
}

export default function ResetPasswordPage({ searchParams }: Props) {
  const { token } = searchParams;

  return (
    <AuthCard
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe d'au moins 8 caractères"
      footer={<AuthLink href="/login">Retour à la connexion</AuthLink>}
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-3">
          <Alert variant="destructive">
            <XCircle size={16} />
            <AlertDescription>Lien invalide : le jeton est manquant.</AlertDescription>
          </Alert>
          <p className="text-center text-sm">
            <AuthLink href="/forgot-password">Demander un nouveau lien</AuthLink>
          </p>
        </div>
      )}
    </AuthCard>
  );
}
