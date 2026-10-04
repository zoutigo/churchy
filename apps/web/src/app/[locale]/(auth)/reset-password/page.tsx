import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  searchParams: { token?: string };
}

export default function ResetPasswordPage({ searchParams }: Props) {
  const t = useTranslations('auth.reset');
  const tf = useTranslations('auth.forgot');
  const { token } = searchParams;

  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      footer={<AuthLink href="/login">{tf('back')}</AuthLink>}
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-3">
          <Alert variant="destructive">
            <XCircle size={16} />
            <AlertDescription>{t('missingToken')}</AlertDescription>
          </Alert>
          <p className="text-center text-sm">
            <AuthLink href="/forgot-password">{t('newLink')}</AuthLink>
          </p>
        </div>
      )}
    </AuthCard>
  );
}
