import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CelebrationType, type PublicCelebrationSummary } from '@churchy/shared';
import { CelebrationItem } from './CelebrationItem';

const celebration: PublicCelebrationSummary = {
  id: 'c1',
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

  it('sans lieu, n’affiche pas de ligne de lieu', () => {
    render(<CelebrationItem celebration={{ ...celebration, location: null }} parishId="p1" />);
    expect(screen.queryByText('Église Saint-Pierre')).not.toBeInTheDocument();
  });
});
