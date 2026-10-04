import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Parish } from '@churchy/shared';
import { ParishInfoSummary } from './ParishInfoSummary';

const parish = {
  id: 'p1',
  name: 'Saint-Pierre',
  slug: 'saint-pierre',
  city: 'Nantes',
  country: 'France',
  address: '3 rue de la Paix',
  district: 'Centre',
  phone: '+33 6 12 34 56 78',
  description: 'Une paroisse accueillante',
} as Parish;

describe('ParishInfoSummary', () => {
  it('affiche les données en lecture seule, sans champ de saisie', () => {
    render(<ParishInfoSummary parish={parish} />);
    expect(screen.getByText('3 rue de la Paix, Centre, Nantes, France')).toBeInTheDocument();
    expect(screen.getByText('+33 6 12 34 56 78')).toBeInTheDocument();
    expect(screen.getByText('Une paroisse accueillante')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('signale les champs non renseignés', () => {
    render(<ParishInfoSummary parish={parish} />);
    expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(0);
  });
});
