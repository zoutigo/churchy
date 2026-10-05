import { useTranslations } from 'next-intl';
import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { RegisterPanel } from '@/components/auth/RegisterPanel';

export default function RegisterPage() {
  const t = useTranslations('auth.register');
  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      footer={t.rich('haveAccount', {
        link: (chunks) => <AuthLink href="/login">{chunks}</AuthLink>,
      })}
    >
      <RegisterPanel />
    </AuthCard>
  );
}
