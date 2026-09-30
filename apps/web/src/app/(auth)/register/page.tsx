import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthCard
      title="Créer un compte"
      subtitle="Rejoignez Churchy pour gérer vos célébrations"
      footer={
        <>
          Déjà un compte ? <AuthLink href="/login">Se connecter</AuthLink>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
