'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname as useRealPathname, useRouter as useNextRouter } from 'next/navigation';
import { LOCALES, isLocale, type Locale } from '@churchy/shared';
import { useAuth } from '@/hooks/useAuth';
import { writeLocaleCookie } from '@/i18n/cookie';
import { localizeHref, localizeSearch } from '@/i18n/paths';
import { usePathname } from '@/i18n/link';
import { DEFAULT_LOCALE } from '@/i18n/routing';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/forms/submit-error';
import { cn } from '@/lib/utils';

/** Texte du toast, dans la langue **choisie** (la page ne l'a pas encore). */
const CHANGED: Record<Locale, string> = { fr: 'Langue : français', en: 'Language: English' };
const NOT_SAVED: Record<Locale, string> = {
  fr: 'Langue changée, mais non enregistrée sur votre compte',
  en: 'Language changed, but not saved to your account',
};

/**
 * Choix de la langue (FR | EN). Visiteur : cookie `NEXT_LOCALE`. Connecté : en plus, enregistrée sur le
 * compte (base de données). Site public : on va à la même page dans l'autre langue (URL traduite) ;
 * tableau de bord (sans préfixe) : la page est rechargée dans la nouvelle langue.
 * Ce sont de vrais liens (`hreflang`) : utilisables sans JavaScript et lisibles par les moteurs de recherche.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const raw = useLocale();
  const current = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = useTranslations('language');
  const { user, setLocale } = useAuth();
  const router = useNextRouter();
  const realPathname = useRealPathname() ?? '/';
  const internalPath = usePathname();
  const [busy, setBusy] = useState(false);
  const onDashboard = realPathname === '/dashboard' || realPathname.startsWith('/dashboard/');

  const hrefFor = (locale: Locale) =>
    onDashboard ? realPathname : localizeHref(locale, internalPath);

  async function choose(event: React.MouseEvent<HTMLAnchorElement>, locale: Locale) {
    if (locale === current || busy) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    setBusy(true);
    let saved = true;
    if (user) {
      try {
        await setLocale(locale);
      } catch (err) {
        saved = false;
        notify.error(NOT_SAVED[locale], errorMessage(err, ''));
      }
    }
    writeLocaleCookie(locale);
    if (saved) notify.success(CHANGED[locale]);
    // La recherche et l'ancre sont conservées (ex. `?q=douala`).
    const target = onDashboard
      ? null
      : `${hrefFor(locale)}${localizeSearch(locale, window.location.search)}${window.location.hash}`;
    if (target) router.replace(target);
    else router.refresh();
    setBusy(false);
  }

  return (
    <div
      role="group"
      aria-label={t('switchTo')}
      className={cn(
        'inline-flex items-center rounded-lg border border-churchy-200 bg-white p-0.5',
        className,
      )}
    >
      {LOCALES.map((locale) => (
        <a
          key={locale}
          href={hrefFor(locale)}
          hrefLang={locale}
          lang={locale}
          aria-label={t(locale)}
          aria-current={locale === current ? 'true' : undefined}
          onClick={(e) => choose(e, locale)}
          className={cn(
            'inline-flex h-8 min-w-9 items-center justify-center rounded-md px-2 text-xs font-semibold uppercase tracking-wide transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500',
            locale === current
              ? 'bg-churchy-700 text-white'
              : 'text-churchy-700 hover:bg-churchy-100',
          )}
        >
          {locale}
        </a>
      ))}
    </div>
  );
}
