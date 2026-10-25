import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest to handle TypeScript files
  preset: 'ts-jest/presets/default-esm',

  // Node environment for backend tests
  testEnvironment: 'node',

  // Only look for tests inside server/tests/
  testMatch: ['**/server/tests/**/*.test.ts'],

  // Module name mapper — resolves bare .ts imports used inside source files
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // ts-jest options
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
        },
      },
    ],
  },

  extensionsToTreatAsEsm: ['.ts'],

  // Coverage config
  collectCoverageFrom: [
    'server/src/**/*.ts',
    '!server/src/server.ts', // exclude entry point (not unit-testable)
  ],

  coverageReporters: ['text', 'lcov', 'json-summary'],

  coverageDirectory: 'coverage',

  // Clear mocks between each test
  clearMocks: true,
  restoreMocks: true,

  // Show verbose output
  verbose: true,
};

export default config;
