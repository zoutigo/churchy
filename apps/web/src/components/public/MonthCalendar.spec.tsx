import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  CelebrationType,
  type PublicCalendar,
  type PublicCelebrationSummary,
} from '@churchy/shared';
import { MonthCalendar } from './MonthCalendar';

const item = (over: Partial<PublicCelebrationSummary>): PublicCelebrationSummary => ({
  id: 'o1',
  celebrationId: 'c1',
  title: 'Messe dominicale',
  date: '2026-10-04T08:00:00.000Z',
  location: null,
  type: CelebrationType.SUNDAY_MASS,
  sheetStatus: 'AVAILABLE',
  cancelled: false,
  cancelReason: null,
  timezone: 'Africa/Douala',
  ...over,
});

const calendar = (items: PublicCelebrationSummary[], month = '2026-10'): PublicCalendar => ({
  month,
  timezone: 'Africa/Douala',
  items,
});

const renderCal = (items: PublicCelebrationSummary[], month?: string, today = '2026-10-03') =>
  render(<MonthCalendar calendar={calendar(items, month)} parishId="p1" today={today} />);

describe('MonthCalendar', () => {
  it('titre du mois et navigation vers le mois précédent / suivant', () => {
    renderCal([]);
    expect(screen.getByRole('heading', { name: 'octobre 2026' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mois précédent' })).toHaveAttribute(
      'href',
      '/paroisses/p1/calendrier?mois=2026-09',
    );
    expect(screen.getByRole('link', { name: 'Mois suivant' })).toHaveAttribute(
      'href',
      '/paroisses/p1/calendrier?mois=2026-11',
    );
  });

  it('la navigation passe d’une année à l’autre', () => {
    renderCal([], '2026-12');
    expect(screen.getByRole('link', { name: 'Mois suivant' })).toHaveAttribute(
      'href',
      '/paroisses/p1/calendrier?mois=2027-01',
    );
  });

  it('mois vide : message explicite (liste mobile)', () => {
    renderCal([]);
    expect(
      within(screen.getByTestId('calendar-list')).getByText(
        /Aucune célébration annoncée ce mois-ci/,
      ),
    ).toBeInTheDocument();
  });

  it('chaque messe est un lien vers sa page, à l’heure de la paroisse (grille et liste)', () => {
    renderCal([item({})]);
    for (const view of ['calendar-grid', 'calendar-list']) {
      const link = within(screen.getByTestId(view)).getByRole('link', { name: /Messe dominicale/ });
      expect(link).toHaveAttribute('href', '/paroisses/p1/messes/o1');
      expect(link).toHaveTextContent('09:00'); // 08:00 UTC = 09:00 à Douala
    }
  });

  it('la grille place la messe dans le bon jour local', () => {
    renderCal([item({ date: '2026-10-03T23:30:00.000Z' })]); // minuit 30 le 4 à Douala
    const grid = screen.getByTestId('calendar-grid');
    const cell = within(grid).getByText('4', { selector: 'p' }).closest('div')!;
    expect(within(cell).getByRole('link', { name: /Messe dominicale/ })).toBeInTheDocument();
  });

  it('une date annulée est barrée et annoncée comme annulée aux lecteurs d’écran', () => {
    renderCal([item({ cancelled: true })]);
    const link = within(screen.getByTestId('calendar-grid')).getByRole('link');
    expect(link).toHaveClass('line-through');
    expect(link).toHaveTextContent('(annulée)');
  });

  it('distingue feuille disponible et en préparation par la couleur', () => {
    renderCal([
      item({ id: 'a', title: 'Disponible' }),
      item({ id: 'b', title: 'En préparation', sheetStatus: 'IN_PREPARATION' }),
    ]);
    const grid = within(screen.getByTestId('calendar-grid'));
    expect(grid.getByRole('link', { name: /Disponible/ })).toHaveClass('bg-churchy-200');
    expect(grid.getByRole('link', { name: /En préparation/ })).toHaveClass('bg-amber-400/20');
  });

  it('aujourd’hui est mis en évidence (liste : « aujourd’hui »)', () => {
    renderCal([item({})], '2026-10', '2026-10-04');
    expect(
      within(screen.getByTestId('calendar-list')).getByText(/aujourd’hui/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('calendar-grid')).getByText('4', { selector: 'p' }),
    ).toHaveClass('bg-amber-500');
  });

  it('les jours hors mois n’affichent pas de messe', () => {
    // Le 30 septembre apparaît dans la première semaine d'octobre 2026 mais n'appartient pas au mois.
    renderCal([item({ date: '2026-09-30T08:00:00.000Z' })]);
    expect(
      within(screen.getByTestId('calendar-grid')).queryByRole('link', { name: /Messe dominicale/ }),
    ).not.toBeInTheDocument();
  });
});
