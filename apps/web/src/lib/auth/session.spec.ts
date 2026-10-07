import { describe, expect, it } from 'vitest';
import { afterLoginPath, hasSessionFlag, safeNextPath } from './session';

describe('hasSessionFlag', () => {
  it('détecte le cookie de session parmi d’autres', () => {
    expect(hasSessionFlag('a=1; churchy_session=1; b=2')).toBe(true);
    expect(hasSessionFlag('churchy_session=1')).toBe(true);
  });

  it('est faux sans cookie, avec une autre valeur ou un nom voisin', () => {
    expect(hasSessionFlag('')).toBe(false);
    expect(hasSessionFlag('churchy_session=0')).toBe(false);
    expect(hasSessionFlag('not_churchy_session=1')).toBe(false);
  });
});

describe('safeNextPath', () => {
  it('accepte un chemin relatif du site (avec requête)', () => {
    expect(safeNextPath('/dashboard/parishes?x=1')).toBe('/dashboard/parishes?x=1');
  });

  it.each([
    ['https://evil.example'],
    ['//evil.example'],
    ['/\\evil.example'],
    ['javascript:alert(1)'],
    [''],
    [null],
    [undefined],
  ])('rejette %s (redirection ouverte) et retombe sur le dashboard', (value) => {
    expect(safeNextPath(value)).toBe('/dashboard');
  });

  it('utilise le repli fourni', () => {
    expect(safeNextPath('https://evil.example', '/login')).toBe('/login');
  });
});

describe('afterLoginPath', () => {
  it.each(['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])(
    'un %s arrive sur la plateforme quand aucune destination n’est demandée',
    (role) => {
      expect(afterLoginPath({ role })).toBe('/platform');
    },
  );

  it('un compte ordinaire arrive sur son tableau de bord', () => {
    expect(afterLoginPath({ role: 'USER' })).toBe('/dashboard');
  });

  it('une destination explicite (?next=) passe toujours avant', () => {
    expect(afterLoginPath({ role: 'ADMIN' }, '/dashboard/parishes')).toBe('/dashboard/parishes');
    expect(afterLoginPath({ role: 'USER' }, '/dashboard/security')).toBe('/dashboard/security');
  });
});
