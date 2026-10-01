import { describe, expect, it } from 'vitest';
import { localInputToIso } from './datetime';

describe('localInputToIso', () => {
  it('convertit une saisie datetime-local en ISO UTC (valide pour z.string().datetime())', () => {
    const out = localInputToIso('2026-10-04T09:30');
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // Aller-retour : l'instant correspond bien à l'heure locale saisie.
    expect(new Date(out as string).getTime()).toBe(new Date(2026, 9, 4, 9, 30).getTime());
  });

  it('renvoie null pour une saisie vide ou invalide', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso('pas une date')).toBeNull();
  });
});
