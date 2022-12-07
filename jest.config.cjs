/* eslint-env node */

module.exports = {
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  testRegex: '/tests/.*\\.spec\\.(ts|tsx|js)$',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
};
