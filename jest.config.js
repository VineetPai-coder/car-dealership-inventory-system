/** @type {import('jest').Config} */
const config = {
  // Use ts-jest to handle TypeScript files
  preset: 'ts-jest/presets/default-esm',

  // Node environment for backend tests
  testEnvironment: 'node',

  // Backend and browser-facing client tests
  testMatch: ['**/server/tests/**/*.test.ts', '**/client/tests/**/*.test.tsx'],

  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Car Dealership Inventory System — Test Report',
        outputPath: 'TEST_REPORT.html',
        includeFailureMsg: true,
      },
    ],
  ],

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
          target: 'ES2022',
          jsx: 'react-jsx',
        },
      },
    ],
  },

  extensionsToTreatAsEsm: ['.ts', '.tsx'],

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
