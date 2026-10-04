import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Playfair_Display, Poppins } from 'next/font/google';
import { SITE_URL } from '@/lib/site';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { FavoritesProvider } from '@/components/favorites/FavoritesProvider';
import { LocaleSync } from '@/components/i18n/LocaleSync';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

/** Base commune à toutes les pages (y compris le tableau de bord) ; le texte par langue vient de `[locale]/layout.tsx`. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Churchy',
  applicationName: 'Churchy',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${playfair.variable} ${poppins.variable} font-poppins`}>
        <NextIntlClientProvider>
          <AuthProvider>
            <LocaleSync />
            <FavoritesProvider>{children}</FavoritesProvider>
          </AuthProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
