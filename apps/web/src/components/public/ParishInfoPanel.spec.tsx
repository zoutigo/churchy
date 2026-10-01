import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PublicParish } from '@churchy/shared';
import { ParishInfoPanel } from './ParishInfoPanel';

const parish: PublicParish = {
  id: 'p1',
  name: 'Saint-Pierre',
  city: 'Lyon',
  country: 'France',
  district: 'Croix-Rousse',
  address: '1 place de l’Église',
  mainChurch: 'Église Saint-Pierre',
  phone: '04 00 00 00 00',
  email: 'contact@paroisse.fr',
  website: 'https://paroisse.fr',
  description: null,
  imageUrl: null,
};

describe('ParishInfoPanel', () => {
  it('affiche adresse, téléphone, email et site avec les bons liens', () => {
    render(<ParishInfoPanel parish={parish} />);
    expect(screen.getByText(/1 place de l’Église, Croix-Rousse, Lyon/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '04 00 00 00 00' })).toHaveAttribute(
      'href',
      'tel:0400000000',
    );
    expect(screen.getByRole('link', { name: 'contact@paroisse.fr' })).toHaveAttribute(
      'href',
      'mailto:contact@paroisse.fr',
    );
    const site = screen.getByRole('link', { name: 'paroisse.fr' });
    expect(site).toHaveAttribute('href', 'https://paroisse.fr');
  });

  it('le lien externe ne donne pas accès à la fenêtre d’origine', () => {
    render(<ParishInfoPanel parish={parish} />);
    const site = screen.getByRole('link', { name: 'paroisse.fr' });
    expect(site).toHaveAttribute('target', '_blank');
    expect(site.getAttribute('rel')).toContain('noopener');
  });

  it('omet les coordonnées non renseignées', () => {
    render(
      <ParishInfoPanel
        parish={{ ...parish, phone: null, email: null, website: null, address: null }}
      />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/Croix-Rousse, Lyon/)).toBeInTheDocument();
  });
});
