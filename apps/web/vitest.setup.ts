import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

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
  // Absent dans les tests qui tournent sous l'environnement « node » (ex. middleware).
  if (typeof localStorage !== 'undefined') localStorage.clear();
});
