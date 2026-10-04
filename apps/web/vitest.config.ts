import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}', 'scripts/**/*.spec.ts'],
    css: false,
    // next-intl importe `next/server` sans extension : à faire transformer par Vite pour le test du middleware.
    server: { deps: { inline: ['next-intl'] } },
    // Les tests de formulaires saisissent beaucoup de texte dans jsdom : marge pour les machines chargées
    // (précommit et CI lancent tous les workspaces en parallèle).
    testTimeout: 30_000,
  },
});
