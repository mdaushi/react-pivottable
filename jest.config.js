/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/src/__tests__/**/*-test.js'],
  transform: {
    '^.+\\.[j]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/src/__tests__/styleMock.js',
  },
};
