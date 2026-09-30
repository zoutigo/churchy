import { describe, expect, it } from 'vitest';
import { clearSession, getSession, isAuthenticated, saveSession } from './session';

describe('session', () => {
  it('est vide au départ', () => {
    expect(getSession()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it('enregistre puis efface le jeton', () => {
    saveSession('tok');
    expect(getSession()).toBe('tok');
    expect(isAuthenticated()).toBe(true);

    clearSession();
    expect(getSession()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});
