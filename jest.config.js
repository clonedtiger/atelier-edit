/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Map alias @/ to src/
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};

module.exports = config;
