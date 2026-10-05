import { useTranslations } from 'next-intl';
import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { ForgotPinForm } from '@/components/auth/ForgotPinForm';

export default function ForgotPinPage() {
  const t = useTranslations('auth.forgotPin');
  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      footer={<AuthLink href="/login">{t('back')}</AuthLink>}
    >
      <ForgotPinForm />
    </AuthCard>
  );
}
