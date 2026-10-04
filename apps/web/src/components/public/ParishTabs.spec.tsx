import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParishTabs } from './ParishTabs';

let pathname: string;
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('ParishTabs', () => {
  beforeEach(() => {
    pathname = '/paroisses/p1';
  });

  it('propose accueil, messes, calendrier, annonces et activités de CETTE paroisse', () => {
    render(<ParishTabs parishId="p1" />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/fr/paroisses/p1',
      '/fr/paroisses/p1/messes',
      '/fr/paroisses/p1/calendrier',
      '/fr/paroisses/p1/annonces',
      '/fr/paroisses/p1/activites',
    ]);
  });

  it('marque l’accueil comme page courante seulement sur l’accueil', () => {
    render(<ParishTabs parishId="p1" />);
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Messes' })).not.toHaveAttribute('aria-current');
  });

  it('une sous-page (détail d’une messe) garde l’onglet Messes actif, pas l’accueil', () => {
    pathname = '/paroisses/p1/messes/c1';
    render(<ParishTabs parishId="p1" />);
    expect(screen.getByRole('link', { name: 'Messes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Accueil' })).not.toHaveAttribute('aria-current');
  });

  it('l’accueil est une icône sur mobile : le mot reste accessible et visible dès sm', () => {
    render(<ParishTabs parishId="p1" />);
    const home = screen.getByRole('link', { name: 'Accueil' });
    expect(home.querySelector('svg')).toHaveClass('sm:hidden');
    expect(screen.getByText('Accueil')).toHaveClass('sr-only', 'sm:not-sr-only');
    expect(screen.getByText('Messes')).not.toHaveClass('sr-only');
  });
});
