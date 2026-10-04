import { describe, expect, it } from 'vitest';
import fr from '../../messages/fr.json';
import en from '../../messages/en.json';

const keys = (value: unknown, prefix = ''): string[] =>
  value && typeof value === 'object'
    ? Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
    : [prefix.slice(0, -1)];

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
const flatten = (value: unknown, prefix = ''): Record<string, string> =>
  value && typeof value === 'object'
    ? Object.assign({}, ...Object.entries(value).map(([k, v]) => flatten(v, `${prefix}${k}.`)))
    : { [prefix.slice(0, -1)]: String(value) };

describe('messages FR / EN', () => {
  it('ont exactement les mêmes clés', () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it('n’ont aucun texte vide', () => {
    for (const [key, text] of Object.entries({ ...flatten(fr), ...flatten(en) })) {
      expect(text.trim(), key).not.toBe('');
    }
  });

  it('utilisent les mêmes variables ({nom}) dans les deux langues', () => {
    const f = flatten(fr);
    const e = flatten(en);
    for (const key of Object.keys(f)) {
      expect(placeholders(e[key] ?? ''), key).toEqual(placeholders(f[key]));
    }
  });
});
