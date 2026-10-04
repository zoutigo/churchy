import { useTranslations } from 'next-intl';
import { AuthCard } from '@/components/auth/AuthCard';
import { VerifyEmail } from '@/components/auth/VerifyEmail';

interface Props {
  searchParams: { token?: string };
}

export default function VerifyEmailPage({ searchParams }: Props) {
  const t = useTranslations('auth.verify');
  return (
    <AuthCard title={t('title')}>
      <VerifyEmail token={searchParams.token} />
    </AuthCard>
  );
}
