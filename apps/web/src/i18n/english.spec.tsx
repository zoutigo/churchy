import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  CelebrationType,
  type PublicCalendar,
  type PublicCelebrationSummary,
} from '@churchy/shared';
import { setTestLocale } from '../../vitest.setup';
import { MonthCalendar } from '@/components/public/MonthCalendar';
import { CelebrationItem } from '@/components/public/CelebrationItem';
import { ParishResultCard } from '@/components/public/ParishResultCard';
import { ParishCard } from '@/components/parish/ParishCard';
import { ParishTabs } from '@/components/public/ParishTabs';
import { PublicHeader } from '@/components/public/PublicHeader';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';
import { ContactForm } from '@/components/public/ContactForm';
import { formatDateLong, formatDateParts, formatDateTimeLong, formatTime } from '@/lib/format';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/en/parishes/p1',
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, initializing: false, loading: false, login: vi.fn() }),
}));
vi.mock('@/components/favorites/FavoritesProvider', () => ({
  useFavorites: () => ({ ids: ['a', 'b'], ready: true, isFavorite: () => false, toggle: vi.fn() }),
}));

const item = (over: Partial<PublicCelebrationSummary> = {}): PublicCelebrationSummary => ({
  id: 'o1',
  celebrationId: 'c1',
  title: 'Sunday Mass',
  date: '2026-10-04T08:00:00.000Z',
  location: 'Saint Peter',
  type: CelebrationType.SUNDAY_MASS,
  sheetStatus: 'AVAILABLE',
  cancelled: false,
  cancelReason: null,
  timezone: 'Africa/Douala',
  ...over,
});

beforeEach(() => setTestLocale('en'));

describe('formats de date en anglais', () => {
  const iso = '2026-10-04T08:30:00.000Z';
  const tz = { timeZone: 'UTC', locale: 'en' } as const;

  it('jour avant le mois (usage britannique) et heure sur 24 h', () => {
    // Selon la version d'ICU, une virgule suit le jour de la semaine.
    expect(formatDateLong(iso, tz)).toMatch(/^Sunday,? 4 October 2026$/);
    expect(formatTime(iso, tz)).toBe('08:30');
    expect(formatDateParts(iso, tz)).toEqual({ weekday: 'Sun', day: '4', month: 'Oct' });
  });

  it('« at » remplace « à »', () => {
    expect(formatDateTimeLong(iso, tz)).toMatch(/^Sunday,? 4 October 2026 at 08:30$/);
    expect(formatDateTimeLong(iso, { timeZone: 'UTC' })).toBe('dimanche 4 octobre 2026 à 08:30');
  });
});

describe('site public en anglais', () => {
  it('en-tête : liens traduits, URL traduites, pluriel des favoris', () => {
    render(<PublicHeader hasSession={false} />);
    const nav = screen.getAllByRole('navigation', { name: 'Main navigation' })[0];
    expect(within(nav).getByRole('link', { name: 'For parishes' })).toHaveAttribute(
      'href',
      '/en/for-parishes',
    );
    expect(within(nav).getByRole('link', { name: /My favorites/ })).toHaveAttribute(
      'href',
      '/en/favorites',
    );
    expect(within(nav).getByLabelText('2 favorites')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/en/login');
    expect(screen.getByRole('link', { name: 'Churchy, home' })).toHaveAttribute('href', '/en');
  });

  it('onglets d’une paroisse : libellés et adresses', () => {
    render(<ParishTabs parishId="p1" />);
    const hrefs = Object.fromEntries(
      screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]),
    );
    expect(hrefs).toEqual({
      Home: '/en/parishes/p1',
      Masses: '/en/parishes/p1/masses',
      Calendar: '/en/parishes/p1/calendar',
      Announcements: '/en/parishes/p1/announcements',
      Activities: '/en/parishes/p1/activities',
    });
  });

  it('carte de célébration : date, type et état de la feuille en anglais', () => {
    render(<CelebrationItem celebration={item()} parishId="p1" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/parishes/p1/masses/o1');
    expect(screen.getByText('Sheet available')).toBeInTheDocument();
    expect(screen.getByText(/Sunday Mass$/, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('annulée avec motif', () => {
    render(
      <CelebrationItem
        celebration={item({ cancelled: true, cancelReason: 'Retreat' })}
        parishId="p1"
      />,
    );
    expect(screen.getByText('Cancelled — Retreat')).toBeInTheDocument();
  });

  it('carte de paroisse : le pays est affiché en anglais', () => {
    const parish = { id: 'p1', name: 'Saint Peter', city: 'Douala', country: 'Cameroun' };
    render(<ParishCard parish={parish as never} />);
    expect(screen.getByText('Douala, Cameroon')).toBeInTheDocument();
  });

  it('résultat de recherche : prochaine messe', () => {
    render(
      <ParishResultCard
        parish={{
          id: 'p1',
          name: 'Saint Peter',
          city: 'Douala',
          country: 'Cameroun',
          district: null,
          mainChurch: null,
          nextCelebration: item({ sheetStatus: 'IN_PREPARATION' }),
        }}
      />,
    );
    expect(screen.getByText(/^Next Mass: Sun,? 4 Oct at 09:00$/)).toBeInTheDocument();
    expect(screen.getByText('Sheet in preparation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View the parish Saint Peter' })).toHaveAttribute(
      'href',
      '/en/parishes/p1',
    );
  });

  it('calendrier : mois en anglais, navigation, légende colorée', () => {
    const calendar: PublicCalendar = {
      month: '2026-10',
      timezone: 'Africa/Douala',
      items: [item({ cancelled: true })],
    };
    render(<MonthCalendar calendar={calendar} parishId="p1" today="2026-10-03" />);
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Previous month' })).toHaveAttribute(
      'href',
      '/en/parishes/p1/calendar?mois=2026-09',
    );
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('red')).toHaveClass('text-red-700');
    expect(screen.getAllByText(/\(cancelled\)/).length).toBeGreaterThan(0);
  });
});

describe('formulaires en anglais', () => {
  it('connexion', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute(
      'href',
      '/en/forgot-password',
    );
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('connexion : les erreurs de validation (codes des schémas) sont en anglais', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('connexion : les mêmes erreurs restent en français en français', async () => {
    setTestLocale('fr');
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText('Email invalide')).toBeInTheDocument();
    expect(screen.getByText('Mot de passe requis')).toBeInTheDocument();
  });

  it('contact : sujets traduits', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('Ask a question');
  });
});
