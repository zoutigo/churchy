import { defineConfig, devices } from '@playwright/test';

/**
 * Tests fonctionnels front : vrai navigateur + vrai web + vraie API + base churchy_test.
 * Ports dédiés (web 3210, api 3211) : ils ne perturbent pas les serveurs de dev (3200/3201).
 */
const WEB = 'http://localhost:3210';
const API = 'http://localhost:3211';

export default defineConfig({
  testDir: './e2e',
  // Les tests sont indépendants (données uniques par test) : le découpage en shards se fait par test.
  fullyParallel: true,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Utilise le Chrome installé (évite de télécharger les navigateurs Playwright).
      // En CI : `npx playwright install chromium` puis retirer `channel`.
      use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL ?? 'chrome' },
    },
  ],
  webServer: [
    {
      // Réinitialise la base de test (migrations + truncate) puis lance l'API dessus.
      command: 'node scripts/reset-test-db.js && npm run start',
      cwd: '../api',
      url: `${API}/api/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '3211',
        FRONTEND_URL: WEB,
        DATABASE_URL:
          process.env.TEST_DATABASE_URL ??
          'postgresql://postgres:password@localhost:5433/churchy_test?schema=public',
        NODE_ENV: 'test',
        REDIS_DB: '15',
        JWT_SECRET: 'e2e-secret-e2e-secret-0123456789',
        // Les scénarios enchaînent plus de connexions que la limite de production.
        AUTH_THROTTLE_LIMIT: '10000',
        THROTTLE_LIMIT: '100000',
      },
    },
    {
      command: 'npx next dev --port 3210',
      url: `${WEB}/fr/connexion`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_API_URL: `${API}/api`,
        NEXT_DIST_DIR: '.next-e2e',
      },
    },
  ],
});
