import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CelebrationType, type CelebrationListItem } from '@churchy/shared';
import { CelebrationCard } from './CelebrationCard';

const celebration: CelebrationListItem = {
  id: 'c1',
  title: 'Messe du dimanche',
  type: CelebrationType.SUNDAY_MASS,
  location: 'Église Saint-Pierre',
  announced: true,
  archivedAt: null,
  defaultTemplate: { id: 't1', name: 'Messe dominicale' },
  occurrenceCount: 12,
  upcomingCount: 9,
  nextOccurrence: { id: 'o1', startsAt: '2026-10-04T08:00:00.000Z', status: 'SCHEDULED' },
  lastOccurrenceAt: '2026-12-27T09:00:00.000Z',
  endingSoon: false,
};

const renderCard = (over: Partial<CelebrationListItem> = {}) =>
  render(
    <CelebrationCard
      celebration={{ ...celebration, ...over }}
      parishId="p1"
      timezone="Africa/Douala"
    />,
  );

describe('CelebrationCard', () => {
  it('vue administration : pointe vers la série dans le dashboard de la paroisse', () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/dashboard/parishes/p1/celebrations/c1',
    );
  });

  it('affiche titre, lieu, nombre de dates et modèle', () => {
    renderCard();
    expect(screen.getByText('Messe du dimanche')).toBeInTheDocument();
    expect(screen.getByText(/Église Saint-Pierre/)).toBeInTheDocument();
    expect(screen.getByText(/12 dates dont 9 à venir/)).toBeInTheDocument();
    expect(screen.getByText(/modèle « Messe dominicale »/)).toBeInTheDocument();
  });

  it('affiche la prochaine date à l’heure de la paroisse (08:00 UTC = 09:00 à Douala)', () => {
    renderCard();
    expect(screen.getByText(/Prochaine : dimanche 4 octobre 2026 à 09:00/)).toBeInTheDocument();
  });

  it('une seule date : accord au singulier, pas de « dont »', () => {
    renderCard({ occurrenceCount: 1, upcomingCount: 1 });
    expect(screen.getByText(/1 date(?!s)/)).toBeInTheDocument();
    expect(screen.queryByText(/dont/)).not.toBeInTheDocument();
  });

  it('publiée, brouillon et archivée se distinguent', () => {
    const { rerender } = renderCard();
    expect(screen.getByText('Publiée au public')).toBeInTheDocument();

    rerender(
      <CelebrationCard
        celebration={{ ...celebration, announced: false }}
        parishId="p1"
        timezone="UTC"
      />,
    );
    expect(screen.getByText('Brouillon')).toBeInTheDocument();

    rerender(
      <CelebrationCard
        celebration={{ ...celebration, archivedAt: '2026-10-01T10:00:00.000Z' }}
        parishId="p1"
        timezone="UTC"
      />,
    );
    expect(screen.getByText('Archivée')).toBeInTheDocument();
    expect(screen.queryByText('Publiée au public')).not.toBeInTheDocument();
  });

  it('signale une série qui se termine bientôt', () => {
    renderCard({ endingSoon: true });
    expect(screen.getByText('Se termine bientôt')).toBeInTheDocument();
  });

  it('sans date à venir', () => {
    renderCard({ nextOccurrence: null, upcomingCount: 0 });
    expect(screen.getByText('Aucune date à venir')).toBeInTheDocument();
  });

  it('mentionne une prochaine date annulée', () => {
    renderCard({
      nextOccurrence: { id: 'o1', startsAt: '2026-10-04T08:00:00.000Z', status: 'CANCELLED' },
    });
    expect(screen.getByText(/\(annulée\)/)).toBeInTheDocument();
  });
});
