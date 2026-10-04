'use client';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavorites } from './FavoritesProvider';

interface Props {
  parishId: string;
  parishName: string;
  /** `icon` : étoile seule (carte) ; `full` : étoile + libellé (en-tête de paroisse). */
  variant?: 'icon' | 'full';
  className?: string;
}

/** Ajoute / retire une paroisse des favoris. Fonctionne sans compte (appareil) comme connecté (base). */
export function FavoriteButton({ parishId, parishName, variant = 'full', className }: Props) {
  const { isFavorite, toggle, ready } = useFavorites();
  const active = ready && isFavorite(parishId);
  const label = active ? 'Retirer des favoris' : 'Ajouter aux favoris';

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={variant === 'icon' ? `${label} : ${parishName}` : undefined}
      title={variant === 'icon' ? label : undefined}
      disabled={!ready}
      onClick={() => toggle({ id: parishId, name: parishName })}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60',
        variant === 'icon' ? 'h-11 w-11' : 'h-11 px-4',
        active
          ? 'border-amber-500 bg-amber-50 text-churchy-700 hover:bg-amber-100'
          : 'border-churchy-200 bg-white text-churchy-700 hover:bg-churchy-100',
        className,
      )}
    >
      <Star
        size={18}
        aria-hidden
        className={active ? 'fill-amber-500 text-amber-500' : 'text-churchy-700'}
      />
      {variant === 'full' && <span>{active ? 'Dans mes favoris' : 'Ajouter aux favoris'}</span>}
    </button>
  );
}
