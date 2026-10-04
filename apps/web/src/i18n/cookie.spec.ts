import { afterEach, describe, expect, it } from 'vitest';
import { readLocaleCookie, writeLocaleCookie } from './cookie';

afterEach(() => {
  document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
});

describe('cookie de langue', () => {
  it('s’écrit et se relit', () => {
    expect(readLocaleCookie()).toBeNull();
    writeLocaleCookie('en');
    expect(readLocaleCookie()).toBe('en');
    writeLocaleCookie('fr');
    expect(readLocaleCookie()).toBe('fr');
  });

  it('se lit parmi d’autres cookies', () => {
    expect(readLocaleCookie('a=1; NEXT_LOCALE=en; churchy_session=1')).toBe('en');
    expect(readLocaleCookie('a=1')).toBeNull();
  });
});
