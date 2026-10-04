import { describe, expect, it } from 'vitest';
import { MAX_FAVORITE_PARISHES } from '@churchy/shared';
import {
  clearLocalFavorites,
  FAVORITES_KEY,
  readLocalFavorites,
  writeLocalFavorites,
} from './storage';

describe('favoris locaux', () => {
  it('est vide par défaut', () => {
    expect(readLocalFavorites()).toEqual([]);
  });

  it('écrit puis relit dans l’ordre', () => {
    writeLocalFavorites(['b', 'a']);
    expect(readLocalFavorites()).toEqual(['b', 'a']);
  });

  it('ignore un contenu corrompu ou de mauvais type', () => {
    localStorage.setItem(FAVORITES_KEY, '{pas du json');
    expect(readLocalFavorites()).toEqual([]);
    localStorage.setItem(FAVORITES_KEY, '{"a":1}');
    expect(readLocalFavorites()).toEqual([]);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(['a', 3, null, '', 'a', 'b']));
    expect(readLocalFavorites()).toEqual(['a', 'b']);
  });

  it(`ne dépasse jamais ${MAX_FAVORITE_PARISHES} paroisses`, () => {
    const many = Array.from({ length: 25 }, (_, i) => `p${i}`);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(many));
    expect(readLocalFavorites()).toHaveLength(MAX_FAVORITE_PARISHES);
  });

  it('une liste vide supprime la clé', () => {
    writeLocalFavorites(['a']);
    clearLocalFavorites();
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
  });

  it('ne plante pas quand le stockage est indisponible', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('denied');
    };
    try {
      expect(readLocalFavorites()).toEqual([]);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
