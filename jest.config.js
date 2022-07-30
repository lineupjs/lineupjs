/* eslint-env node */

module.exports = {
  testEnvironment: 'jsdom',
  preset: 'ts-jest/presets/js-with-ts',
  testRegex: '/tests/.*\\.spec\\.(ts|tsx|js)$',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
  transformIgnorePatterns: ['/node_modules/(?!d3|d3-.*|internmap)'],
};
