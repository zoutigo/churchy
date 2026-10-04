import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { LanguageSwitcher } from './LanguageSwitcher';

const replace = vi.fn();
const refresh = vi.fn();
let pathname = '/fr/paroisses/p1/messes';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
  usePathname: () => pathname,
}));
const setLocale = vi.fn();
let auth: { user: { id: string } | null; setLocale: typeof setLocale };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
const success = vi.fn();
const error = vi.fn();
vi.mock('@/lib/notify', () => ({
  notify: { success: (...a: unknown[]) => success(...a), error: (...a: unknown[]) => error(...a) },
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    setLocale.mockReset().mockResolvedValue(undefined);
    success.mockReset();
    error.mockReset();
    pathname = '/fr/paroisses/p1/messes';
    auth = { user: null, setLocale };
    document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
  });

  it('propose les deux langues comme de vrais liens (hreflang), la langue courante marquée', () => {
    render(<LanguageSwitcher />);
    const fr = screen.getByRole('link', { name: 'Français' });
    const en = screen.getByRole('link', { name: 'English' });
    expect(fr).toHaveAttribute('aria-current', 'true');
    expect(en).not.toHaveAttribute('aria-current');
    expect(fr).toHaveAttribute('href', '/fr/paroisses/p1/messes');
    expect(en).toHaveAttribute('href', '/en/parishes/p1/masses');
    expect(en).toHaveAttribute('hreflang', 'en');
  });

  it('visiteur : change de langue vers la page traduite, mémorise le cookie, annonce par un toast', async () => {
    window.history.replaceState({}, '', '/fr/paroisses/p1/messes?x=1#a');
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole('link', { name: 'English' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/parishes/p1/masses?x=1#a'));
    expect(document.cookie).toContain('NEXT_LOCALE=en');
    expect(setLocale).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Language: English');
  });

  it('le paramètre traduit suit la langue (mois → month et inversement)', async () => {
    pathname = '/fr/paroisses/p1/calendrier';
    window.history.replaceState({}, '', '/fr/paroisses/p1/calendrier?mois=2026-10');
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole('link', { name: 'English' }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/en/parishes/p1/calendar?month=2026-10'),
    );
  });

  it('connecté : la langue est enregistrée sur le compte avant de naviguer', async () => {
    auth = { user: { id: 'u1' }, setLocale };
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole('link', { name: 'English' }));

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(setLocale).toHaveBeenCalledWith('en');
    expect(setLocale.mock.invocationCallOrder[0]).toBeLessThan(replace.mock.invocationCallOrder[0]);
  });

  it('connecté, enregistrement impossible : la langue change quand même, avec un toast d’erreur', async () => {
    auth = { user: { id: 'u1' }, setLocale };
    setLocale.mockRejectedValue(new Error('hors ligne'));
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole('link', { name: 'English' }));

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(error).toHaveBeenCalledWith(
      'Language changed, but not saved to your account',
      'hors ligne',
    );
    expect(success).not.toHaveBeenCalled();
    expect(document.cookie).toContain('NEXT_LOCALE=en');
  });

  it('tableau de bord (sans préfixe) : recharge la page au lieu de changer d’adresse', async () => {
    pathname = '/dashboard/parishes';
    render(<LanguageSwitcher />);
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute(
      'href',
      '/dashboard/parishes',
    );
    await userEvent.click(screen.getByRole('link', { name: 'English' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(document.cookie).toContain('NEXT_LOCALE=en');
  });

  it('un clic sur la langue déjà active ne fait rien', async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole('link', { name: 'Français' }));
    expect(replace).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

  it('en anglais : libellés anglais, le français est proposé', () => {
    setTestLocale('en');
    pathname = '/en/parishes/p1';
    render(<LanguageSwitcher />);
    expect(screen.getByRole('group', { name: 'Change language' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Français' })).toHaveAttribute(
      'href',
      '/fr/paroisses/p1',
    );
  });
});
