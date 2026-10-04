import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CelebrationType, type PublicParishSummary } from '@churchy/shared';
import { ParishResultCard } from './ParishResultCard';

const toggle = vi.fn();
vi.mock('@/components/favorites/FavoritesProvider', () => ({
  useFavorites: () => ({ isFavorite: () => false, toggle, ready: true }),
}));

const parish: PublicParishSummary = {
  id: 'p1',
  name: 'Saint-Pierre',
  city: 'Lyon',
  country: 'France',
  district: 'Croix-Rousse',
  mainChurch: 'Église Saint-Pierre',
  nextCelebration: null,
};

describe('ParishResultCard', () => {
  it('propose d’ajouter la paroisse aux favoris', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<ParishResultCard parish={parish} />);
    await user.click(screen.getByRole('button', { name: 'Ajouter aux favoris : Saint-Pierre' }));
    expect(toggle).toHaveBeenCalledWith({ id: 'p1', name: 'Saint-Pierre' });
  });

  it('affiche nom, quartier et ville, église principale', () => {
    render(<ParishResultCard parish={parish} />);
    expect(screen.getByRole('heading', { name: 'Saint-Pierre' })).toBeInTheDocument();
    expect(screen.getByText('Croix-Rousse, Lyon')).toBeInTheDocument();
    expect(screen.getByText('Église Saint-Pierre')).toBeInTheDocument();
  });

  it('« Voir la paroisse » mène à la page de la paroisse par id', () => {
    render(<ParishResultCard parish={parish} />);
    expect(screen.getByRole('link', { name: 'Voir la paroisse Saint-Pierre' })).toHaveAttribute(
      'href',
      '/paroisses/p1',
    );
    expect(screen.getByText('Voir la paroisse')).toBeInTheDocument();
  });

  it('sans quartier ni église, n’affiche que la ville', () => {
    render(<ParishResultCard parish={{ ...parish, district: null, mainChurch: null }} />);
    expect(screen.getByText('Lyon')).toBeInTheDocument();
    expect(screen.queryByText('Église Saint-Pierre')).not.toBeInTheDocument();
  });

  it('affiche la prochaine messe et l’état de sa feuille', () => {
    render(
      <ParishResultCard
        parish={{
          ...parish,
          nextCelebration: {
            id: 'c1',
            celebrationId: 's1',
            cancelled: false,
            cancelReason: null,
            timezone: 'Europe/Paris',
            title: 'Messe',
            date: '2026-10-04T12:00:00.000Z',
            location: null,
            type: CelebrationType.SUNDAY_MASS,
            sheetStatus: 'IN_PREPARATION',
          },
        }}
      />,
    );
    expect(screen.getByText(/Prochaine messe :/)).toBeInTheDocument();
    expect(screen.getByText('Feuille en préparation')).toBeInTheDocument();
  });
});
