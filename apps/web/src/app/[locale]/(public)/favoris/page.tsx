import { staticPageMetadata } from '@/lib/seo.server';
import type { Metadata } from 'next';
import { FavoritesPage } from '@/components/favorites/FavoriteParishes';

export const generateMetadata = (): Promise<Metadata> =>
  staticPageMetadata('/favoris', 'favorites');

export default function Page() {
  return <FavoritesPage />;
}
