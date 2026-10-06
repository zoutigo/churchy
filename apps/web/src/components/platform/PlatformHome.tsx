'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

/** Accueil de l'espace plateforme. Les outils d'administration viendront s'y ajouter. */
export function PlatformHome() {
  const t = useTranslations('platform');
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="border-b border-churchy-200 pb-6">
        <h1 className="font-playfair text-3xl font-bold text-churchy-700">{t('home.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('home.welcome')}</p>
      </div>
      <div className="max-w-xl space-y-4 rounded-lg border border-churchy-200 bg-white p-5">
        <p data-testid="platform-role">
          {t.rich('home.yourRole', {
            role: t(`roles.${user.role}`),
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <p className="text-sm text-muted-foreground">{t('home.soon')}</p>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard">{t('home.backToMine')}</Link>
        </Button>
      </div>
    </div>
  );
}
