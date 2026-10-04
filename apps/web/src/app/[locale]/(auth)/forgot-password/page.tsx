import { useTranslations } from 'next-intl';
import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot');
  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      footer={<AuthLink href="/login">{t('back')}</AuthLink>}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
