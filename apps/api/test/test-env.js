// Chargé avant tout module : force une base et un Redis DÉDIÉS aux tests.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:password@localhost:5433/churchy_test?schema=public';
process.env.REDIS_DB = process.env.TEST_REDIS_DB ?? '15';
process.env.JWT_SECRET = 'test-secret-test-secret-0123456789';
process.env.NODE_ENV = 'test';
// Limites très hautes : les tests enchaînent beaucoup d'appels. Le test de limitation les abaisse lui-même.
process.env.AUTH_THROTTLE_LIMIT ??= '10000';
process.env.THROTTLE_LIMIT ??= '100000';
process.env.FRONTEND_URL = 'http://localhost:3210';
// Identifiant client Google fictif : les tests remplacent le vérificateur (jamais d'appel à Google).
process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
// Poivre des PIN : les tests fonctionnels exercent le chemin poivré (comme en production).
process.env.PIN_PEPPER = 'test-pepper-test-pepper-test-pepper-01';
