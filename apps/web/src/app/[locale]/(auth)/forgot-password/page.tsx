import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Nous vous envoyons un lien pour en choisir un nouveau"
      footer={<AuthLink href="/login">Retour à la connexion</AuthLink>}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
