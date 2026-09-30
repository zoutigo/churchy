import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CelebrationStatus, type Celebration } from '@churchy/shared';
import { CelebrationCard } from './CelebrationCard';

const celebration: Celebration = {
  id: 'c1',
  parishId: 'p1',
  templateId: 't1',
  title: 'Messe du dimanche',
  date: new Date('2026-10-04T09:00:00.000Z'),
  location: 'Église Saint-Pierre',
  status: CelebrationStatus.PUBLISHED,
  createdById: 'u1',
  createdAt: new Date('2026-09-30T10:00:00.000Z'),
  updatedAt: new Date('2026-09-30T10:00:00.000Z'),
};

describe('CelebrationCard', () => {
  it('vue publique : pointe vers la page publique de la célébration (et non vers une URL inexistante)', () => {
    render(<CelebrationCard celebration={celebration} publicSlug="saint-pierre" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/p/saint-pierre/celebrations/c1');
  });

  it('vue administration : pointe vers le dashboard de la paroisse', () => {
    render(<CelebrationCard celebration={celebration} parishId="p1" />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/dashboard/parishes/p1/celebrations/c1',
    );
  });

  it('affiche titre, lieu et statut', () => {
    render(<CelebrationCard celebration={celebration} publicSlug="saint-pierre" />);
    expect(screen.getByText('Messe du dimanche')).toBeInTheDocument();
    expect(screen.getByText('Église Saint-Pierre')).toBeInTheDocument();
    expect(screen.getByText('Publiée')).toBeInTheDocument();
  });
});
