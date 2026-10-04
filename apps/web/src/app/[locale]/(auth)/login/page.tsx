import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock } from 'lucide-react';
import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { safeNextPath } from '@/lib/auth/session';

interface Props {
  searchParams: { next?: string; expired?: string; reset?: string };
}

export default function LoginPage({ searchParams }: Props) {
  const t = useTranslations('auth.login');
  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      footer={t.rich('noAccount', {
        link: (chunks) => <AuthLink href="/register">{chunks}</AuthLink>,
      })}
    >
      {searchParams.expired && (
        <Alert variant="warning">
          <Clock size={16} />
          <AlertDescription>{t('expired')}</AlertDescription>
        </Alert>
      )}
      {searchParams.reset && (
        <Alert variant="success">
          <CheckCircle2 size={16} />
          <AlertDescription>{t('resetDone')}</AlertDescription>
        </Alert>
      )}
      <LoginForm next={safeNextPath(searchParams.next)} />
    </AuthCard>
  );
}
