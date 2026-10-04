import type { Metadata } from 'next';
import { FavoritesPage } from '@/components/favorites/FavoriteParishes';

export const metadata: Metadata = { title: 'Mes favoris — Churchy' };

export default function Page() {
  return <FavoritesPage />;
}
