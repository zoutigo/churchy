import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HtmlLang } from '@/components/i18n/HtmlLang';
import { routing } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo';

/** Titre et description par défaut du site public, dans la langue de la page (les pages précisent les leurs). */
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!hasLocale(routing.locales, params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: 'meta' });
  return {
    ...pageMetadata({
      locale: params.locale,
      path: '/',
      title: t('siteTitle'),
      description: t('siteDescription'),
    }),
    // Ni canonical ni hreflang à ce niveau : ils seraient hérités à tort par toutes les pages.
    alternates: undefined,
  };
}

/**
 * Le fournisseur du layout racine est conservé quand on passe de /fr à /en : sans celui-ci, les composants
 * clients garderaient l'ancienne langue (liens, textes). Ce layout est recréé quand `locale` change.
 */
export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!hasLocale(routing.locales, params.locale)) notFound();
  setRequestLocale(params.locale);
  return (
    <NextIntlClientProvider locale={params.locale}>
      <HtmlLang />
      {children}
    </NextIntlClientProvider>
  );
}
