import { describe, expect, it } from 'vitest';
import { stepKey, uniqueKeys } from './template-steps';

describe('stepKey', () => {
  it('slugifie sans accents ni ponctuation', () => {
    expect(stepKey('Chant d’entrée')).toBe('chant-d-entree');
    expect(stepKey('  Prière universelle ! ')).toBe('priere-universelle');
    expect(stepKey('Psaume')).toBe('psaume');
  });

  it('retombe sur une clé par défaut si rien d’exploitable', () => {
    expect(stepKey('✦✦')).toBe('etape');
  });

  it('deux modèles qui nomment pareil une étape obtiennent la même clé (rapprochement au changement de modèle)', () => {
    expect(stepKey('Évangile')).toBe(stepKey('évangile'));
  });
});

describe('uniqueKeys', () => {
  it('suffixe les titres répétés', () => {
    expect(uniqueKeys(['Chant', 'Lecture', 'Chant', 'chant'])).toEqual([
      'chant',
      'lecture',
      'chant-2',
      'chant-3',
    ]);
  });
});
