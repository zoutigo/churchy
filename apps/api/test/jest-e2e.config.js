/** Tests fonctionnels : vraie app Nest + vraie base churchy_test (+ Redis db 15). */
module.exports = {
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test-env.js'],
  globalSetup: '<rootDir>/global-setup.js',
  maxWorkers: 1,
  testTimeout: 30000,
};
