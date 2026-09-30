import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  // Absent dans les tests qui tournent sous l'environnement « node » (ex. middleware).
  if (typeof localStorage !== 'undefined') localStorage.clear();
});
