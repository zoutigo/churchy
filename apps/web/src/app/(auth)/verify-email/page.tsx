import { AuthCard } from '@/components/auth/AuthCard';
import { VerifyEmail } from '@/components/auth/VerifyEmail';

interface Props {
  searchParams: { token?: string };
}

export default function VerifyEmailPage({ searchParams }: Props) {
  return (
    <AuthCard title="Confirmation de l'email">
      <VerifyEmail token={searchParams.token} />
    </AuthCard>
  );
}
