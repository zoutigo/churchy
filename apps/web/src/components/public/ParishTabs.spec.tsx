import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParishTabs } from './ParishTabs';

let pathname: string;
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('ParishTabs', () => {
  beforeEach(() => {
    pathname = '/paroisses/p1';
  });

  it('propose accueil, messes, annonces et activités de CETTE paroisse', () => {
    render(<ParishTabs parishId="p1" />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/paroisses/p1',
      '/paroisses/p1/messes',
      '/paroisses/p1/annonces',
      '/paroisses/p1/activites',
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
});
