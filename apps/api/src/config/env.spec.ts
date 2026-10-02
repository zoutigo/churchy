import { loadEnv } from './env';

const base = { JWT_SECRET: 'a-very-long-random-secret-value' };

describe('loadEnv', () => {
  it('refuse de démarrer sans JWT_SECRET (pas de secret de secours)', () => {
    expect(() => loadEnv({})).toThrow(/JWT_SECRET/);
  });

  it('refuse un secret trop court', () => {
    expect(() => loadEnv({ JWT_SECRET: 'court' })).toThrow(/JWT_SECRET/);
  });

  it('applique les valeurs par défaut', () => {
    const env = loadEnv(base);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(30);
    expect(env.FRONTEND_URL).toBe('http://localhost:3200');
    expect(env.NODE_ENV).toBe('development');
  });

  it('convertit les nombres venant de l’environnement', () => {
    expect(loadEnv({ ...base, AUTH_THROTTLE_LIMIT: '3' }).AUTH_THROTTLE_LIMIT).toBe(3);
  });

  it('TRUST_PROXY_HOPS : 0 par défaut (aucun proxy), nombre entier positif accepté, négatif refusé', () => {
    expect(loadEnv(base).TRUST_PROXY_HOPS).toBe(0);
    expect(loadEnv({ ...base, TRUST_PROXY_HOPS: '1' }).TRUST_PROXY_HOPS).toBe(1);
    expect(() => loadEnv({ ...base, TRUST_PROXY_HOPS: '-1' })).toThrow(/TRUST_PROXY_HOPS/);
  });

  it('refuse un secret d’exemple en production', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'change-me-in-production-use-a-long-random-string',
      }),
    ).toThrow(/valeur d’exemple/);
  });

  it('accepte un vrai secret en production', () => {
    expect(() =>
      loadEnv({ NODE_ENV: 'production', JWT_SECRET: 'x7Gq9TzL2mVb8RkWc4YhN6pJdSaE0uFo' }),
    ).not.toThrow();
  });
});
