'use client';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { EmailPasswordCard } from './EmailPasswordCard';
import { GoogleCard } from './GoogleCard';
import { PhonePinCard } from './PhonePinCard';

/** Page « Sécurité du compte » : quels moyens de connexion existent, et comment en ajouter ou changer. */
export function SecurityPanel() {
  const t = useTranslations('security');
  const { user } = useAuth();
  if (!user) return null;

  const methods = [
    { key: 'password', on: user.methods.password },
    { key: 'pin', on: user.methods.pin },
    { key: 'google', on: user.methods.google },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-churchy-200 pb-5">
        <h1 className="font-playfair text-3xl font-bold text-churchy-700">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <section
        aria-labelledby="methods-title"
        className="rounded-xl border border-churchy-200 bg-white p-4 sm:p-5"
      >
        <h2 id="methods-title" className="mb-3 text-sm font-medium text-churchy-700">
          {t('methods.title')}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {methods.map(({ key, on }) => (
            <li
              key={key}
              data-testid={`method-${key}`}
              data-active={on}
              className="flex items-center gap-2 text-sm"
            >
              {on ? (
                <CheckCircle2 size={16} className="text-churchy-500" aria-hidden />
              ) : (
                <Circle size={16} className="text-muted-foreground" aria-hidden />
              )}
              <span className={on ? 'font-medium' : 'text-muted-foreground'}>
                {t(`methods.${key}`)}
              </span>
              <span className="sr-only">{on ? t('methods.on') : t('methods.off')}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <EmailPasswordCard />
        <div className="space-y-6">
          <PhonePinCard />
          <GoogleCard />
        </div>
      </div>
    </div>
  );
}
