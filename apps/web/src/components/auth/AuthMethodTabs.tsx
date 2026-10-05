'use client';
import { useTranslations } from 'next-intl';
import { Mail, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AuthMethod = 'email' | 'phone';

const OPTIONS = [
  { value: 'email', icon: Mail },
  { value: 'phone', icon: Smartphone },
] as const;

/** Choix du mode de connexion (email ou téléphone) : deux grandes zones de clic, utilisables au pouce. */
export function AuthMethodTabs({
  value,
  onChange,
}: {
  value: AuthMethod;
  onChange: (value: AuthMethod) => void;
}) {
  const t = useTranslations('auth.method');
  return (
    <div
      role="tablist"
      aria-label={t('label')}
      className="grid grid-cols-2 gap-1 rounded-lg bg-churchy-50 p-1"
    >
      {OPTIONS.map(({ value: option, icon: Icon }) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'bg-white text-churchy-700 shadow-sm'
                : 'text-churchy-900/70 hover:text-churchy-700',
            )}
          >
            <Icon size={15} aria-hidden />
            {t(option)}
          </button>
        );
      })}
    </div>
  );
}
