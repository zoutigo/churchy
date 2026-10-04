'use client';
import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { readLocaleCookie, writeLocaleCookie } from '@/i18n/cookie';

/**
 * Aligne la langue de l'appareil sur celle du compte : la base de données fait foi. Dès qu'un compte est
 * connu (connexion ou reprise de session), le cookie de langue prend sa valeur ; sur le tableau de bord
 * (sans préfixe de langue), la page est rechargée si elle n'est pas déjà dans cette langue.
 * Le site public n'est jamais redirigé : l'URL, par exemple un lien partagé, reste explicite.
 */
export function LocaleSync() {
  const { user } = useAuth();
  const locale = useLocale();
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const latest = useRef({ locale, pathname, router });
  latest.current = { locale, pathname, router };

  const accountLocale = user?.locale;
  useEffect(() => {
    if (!accountLocale) return;
    if (readLocaleCookie() !== accountLocale) writeLocaleCookie(accountLocale);
    const { locale: shown, pathname: path, router: r } = latest.current;
    const onDashboard = path === '/dashboard' || path.startsWith('/dashboard/');
    if (onDashboard && shown !== accountLocale) r.refresh();
  }, [user?.id, accountLocale]);

  return null;
}
