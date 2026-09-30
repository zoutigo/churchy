// Chargé avant tout module : force une base et un Redis DÉDIÉS aux tests.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:password@localhost:5433/churchy_test?schema=public';
process.env.REDIS_DB = process.env.TEST_REDIS_DB ?? '15';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
