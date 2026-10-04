import { describe, expect, it } from 'vitest';
import { ContentType, type Content } from '@churchy/shared';
import { ALL_TYPES, filterContents } from './filter';

const make = (title: string, type: ContentType, body = '<p>texte</p>'): Content =>
  ({ id: title, title, type, body, language: 'fr', tags: [] }) as unknown as Content;

const list = [
  make('Je vous salue Marie', ContentType.PRAYER, '<p>Pleine de grâce</p>'),
  make('Ave Maria', ContentType.SONG),
  make('Évangile du jour', ContentType.GOSPEL, 'texte brut ancien'),
];

describe('filterContents', () => {
  it('sans critère, renvoie tout', () => {
    expect(filterContents(list, '', ALL_TYPES)).toHaveLength(3);
    expect(filterContents(list, '   ', ALL_TYPES)).toHaveLength(3);
  });

  it('filtre par type', () => {
    expect(filterContents(list, '', ContentType.SONG).map((c) => c.title)).toEqual(['Ave Maria']);
  });

  it('cherche dans le titre, sans casse ni accents', () => {
    expect(filterContents(list, 'EVANGILE', ALL_TYPES)).toHaveLength(1);
    expect(filterContents(list, 'évangile', ALL_TYPES)).toHaveLength(1);
  });

  it('cherche dans le texte (HTML ignoré) et dans un ancien texte brut', () => {
    expect(filterContents(list, 'grace', ALL_TYPES)).toHaveLength(1);
    expect(filterContents(list, 'ancien', ALL_TYPES)).toHaveLength(1);
    expect(filterContents(list, 'paragraph', ALL_TYPES)).toHaveLength(0);
    expect(filterContents(list, 'p', ALL_TYPES).every((c) => c.body)).toBe(true);
  });

  it('exige tous les mots, dans n’importe quel ordre', () => {
    expect(filterContents(list, 'marie salue', ALL_TYPES)).toHaveLength(1);
    expect(filterContents(list, 'marie inexistant', ALL_TYPES)).toHaveLength(0);
  });

  it('combine type et recherche', () => {
    expect(filterContents(list, 'maria', ContentType.PRAYER)).toHaveLength(0);
    expect(filterContents(list, 'maria', ContentType.SONG)).toHaveLength(1);
  });
});
