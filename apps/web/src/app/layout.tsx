import type { Metadata } from 'next';
import { Playfair_Display, Poppins } from 'next/font/google';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { FavoritesProvider } from '@/components/favorites/FavoritesProvider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://churchy.tigilabs.com';
const SITE_TITLE = 'Churchy — Votre paroisse, à portée de main';
const SITE_DESCRIPTION =
  'Retrouvez les messes, les feuilles de célébration, les annonces et les activités de votre paroisse.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: 'Churchy',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  // Aperçu des liens partagés (WhatsApp, Facebook, X, Telegram…) ; l'image vient de opengraph-image.tsx.
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Churchy',
    url: '/',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${playfair.variable} ${poppins.variable} font-poppins`}>
        <AuthProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
