import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { HtmlLang } from '@/components/i18n/HtmlLang';
import { routing } from '@/i18n/routing';

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
