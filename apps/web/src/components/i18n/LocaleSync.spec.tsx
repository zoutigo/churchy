import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { setTestLocale } from '../../../vitest.setup';
import { LocaleSync } from './LocaleSync';

const refresh = vi.fn();
const replace = vi.fn();
let pathname = '/dashboard';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace }),
  usePathname: () => pathname,
}));
let auth: { user: { id: string; locale: 'fr' | 'en' } | null };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

const clearCookie = () => {
  document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
};

describe('LocaleSync', () => {
  beforeEach(() => {
    refresh.mockReset();
    replace.mockReset();
    pathname = '/dashboard';
    auth = { user: null };
    clearCookie();
  });

  it('visiteur : ne touche à rien', () => {
    render(<LocaleSync />);
    expect(document.cookie).not.toContain('NEXT_LOCALE');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('connecté : la langue du compte devient celle de l’appareil (cookie)', () => {
    auth = { user: { id: 'u1', locale: 'en' } };
    render(<LocaleSync />);
    expect(document.cookie).toContain('NEXT_LOCALE=en');
  });

  it('tableau de bord affiché dans une autre langue que le compte : recharge la page', () => {
    auth = { user: { id: 'u1', locale: 'en' } };
    render(<LocaleSync />);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('tableau de bord déjà dans la langue du compte : pas de rechargement', () => {
    setTestLocale('en');
    auth = { user: { id: 'u1', locale: 'en' } };
    render(<LocaleSync />);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('site public : jamais redirigé (l’URL d’un lien partagé reste explicite)', () => {
    pathname = '/en/parishes/p1';
    auth = { user: { id: 'u1', locale: 'fr' } };
    setTestLocale('en');
    render(<LocaleSync />);
    expect(refresh).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(document.cookie).toContain('NEXT_LOCALE=fr');
  });
});
