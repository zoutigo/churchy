'use client';
import { useMemo, type ComponentProps } from 'react';
import NextLink from 'next/link';
import { useRouter as useNextRouter, usePathname as useNextPathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { isLocale, DEFAULT_LOCALE } from './routing';
import { localizeHref, splitLocale, toInternalPath } from './paths';

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string };

export function Link({ href, ...props }: LinkProps) {
  const locale = useLocale();
  return (
    <NextLink href={localizeHref(isLocale(locale) ? locale : DEFAULT_LOCALE, href)} {...props} />
  );
}

/** Routeur : mêmes chemins internes qu'avec `Link`. */
export function useRouter() {
  const router = useNextRouter();
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return useMemo(
    () => ({
      push: (href: string) => router.push(localizeHref(locale, href)),
      replace: (href: string) => router.replace(localizeHref(locale, href)),
      refresh: () => router.refresh(),
      back: () => router.back(),
    }),
    [router, locale],
  );
}

/** Chemin **interne** de la page courante (sans préfixe de langue, dans la langue de l'URL en français). */
export function usePathname(): string {
  const pathname = useNextPathname() ?? '/';
  const { locale, rest } = splitLocale(pathname);
  return locale ? (toInternalPath(locale, rest) ?? rest) : pathname;
}
