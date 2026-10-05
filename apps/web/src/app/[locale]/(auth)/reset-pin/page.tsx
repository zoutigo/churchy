import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { AuthCard, AuthLink } from '@/components/auth/AuthCard';
import { ResetPinForm } from '@/components/auth/ResetPinForm';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  searchParams: { token?: string };
}

export default function ResetPinPage({ searchParams }: Props) {
  const t = useTranslations('auth.resetPin');
  const tf = useTranslations('auth.forgotPin');
  const { token } = searchParams;

  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      footer={<AuthLink href="/login">{tf('back')}</AuthLink>}
    >
      {token ? (
        <ResetPinForm token={token} />
      ) : (
        <div className="space-y-3">
          <Alert variant="destructive">
            <XCircle size={16} />
            <AlertDescription>{t('missingToken')}</AlertDescription>
          </Alert>
          <p className="text-center text-sm">
            <AuthLink href="/forgot-pin">{t('newLink')}</AuthLink>
          </p>
        </div>
      )}
    </AuthCard>
  );
}
