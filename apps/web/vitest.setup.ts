import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import frMessages from './messages/fr.json';
import enMessages from './messages/en.json';

// next-intl : pas de fournisseur dans les tests de composants. `useLocale` et `useTranslations` s'appuient
// sur les vrais fichiers de messages ; le français par défaut, `setTestLocale('en')` pour l'anglais.
const testState = { locale: 'fr' as 'fr' | 'en' };
export const setTestLocale = (locale: 'fr' | 'en') => {
  testState.locale = locale;
};
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const all = { fr: frMessages, en: enMessages };
  return {
    ...actual,
    useLocale: () => testState.locale,
    useTranslations: (namespace?: string) =>
      actual.createTranslator({
        locale: testState.locale,
        messages: all[testState.locale],
        namespace,
      } as never),
  };
});

// jsdom n'implémente pas la géométrie, dont ProseMirror (éditeur de texte riche) a besoin.
if (typeof Range !== 'undefined') {
  const rect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON() {},
  };
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  document.elementFromPoint = () => null;
  Element.prototype.getClientRects = () => [] as unknown as DOMRectList;
}

afterEach(() => {
  cleanup();
  testState.locale = 'fr';
  // Absent dans les tests qui tournent sous l'environnement « node » (ex. middleware).
  if (typeof localStorage !== 'undefined') localStorage.clear();
});
