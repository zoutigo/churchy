import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CelebrationType, type PublicCelebrationSummary } from '@churchy/shared';
import { CelebrationItem } from './CelebrationItem';

const celebration: PublicCelebrationSummary = {
  id: 'c1',
  celebrationId: 's1',
  cancelled: false,
  cancelReason: null,
  timezone: 'Europe/Paris',
  title: 'Messe dominicale',
  date: '2026-10-04T12:00:00.000Z',
  location: 'Église Saint-Pierre',
  type: CelebrationType.SUNDAY_MASS,
  sheetStatus: 'AVAILABLE',
};

describe('CelebrationItem', () => {
  it('mène à la page publique de la messe (URL par id de paroisse)', () => {
    render(<CelebrationItem celebration={celebration} parishId="p1" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/paroisses/p1/messes/c1');
  });

  it('affiche titre, type, lieu et l’état de la feuille', () => {
    render(<CelebrationItem celebration={celebration} parishId="p1" />);
    expect(screen.getByRole('heading', { name: 'Messe dominicale' })).toBeInTheDocument();
    expect(screen.getByText(/Messe dominicale$/, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Église Saint-Pierre')).toBeInTheDocument();
    expect(screen.getByText('Feuille disponible')).toBeInTheDocument();
  });

  it('feuille en préparation', () => {
    render(
      <CelebrationItem
        celebration={{ ...celebration, sheetStatus: 'IN_PREPARATION' }}
        parishId="p1"
      />,
    );
    expect(screen.getByText('Feuille en préparation')).toBeInTheDocument();
    expect(screen.queryByText('Feuille disponible')).not.toBeInTheDocument();
  });

  it('affiche l’heure dans le fuseau de la paroisse (12:00 UTC = 14:00 à Paris, 13:00 à Douala)', () => {
    const { rerender } = render(<CelebrationItem celebration={celebration} parishId="p1" />);
    expect(screen.getByText('14:00')).toBeInTheDocument();
    rerender(
      <CelebrationItem celebration={{ ...celebration, timezone: 'Africa/Douala' }} parishId="p1" />,
    );
    expect(screen.getByText('13:00')).toBeInTheDocument();
  });

  it('une date annulée est marquée comme telle, avec son motif, à la place de l’état de la feuille', () => {
    render(
      <CelebrationItem
        celebration={{ ...celebration, cancelled: true, cancelReason: 'Pèlerinage' }}
        parishId="p1"
      />,
    );
    expect(screen.getByText('Annulée — Pèlerinage')).toBeInTheDocument();
    expect(screen.queryByText('Feuille disponible')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Messe dominicale' })).toHaveClass('line-through');
  });

  it('sans lieu, n’affiche pas de ligne de lieu', () => {
    render(<CelebrationItem celebration={{ ...celebration, location: null }} parishId="p1" />);
    expect(screen.queryByText('Église Saint-Pierre')).not.toBeInTheDocument();
  });
});
