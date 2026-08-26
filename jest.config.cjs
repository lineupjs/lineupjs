/* eslint-env node */
const path = require('path');

const mapper = {};
for (const d of [
  'd3-dispatch',
  'd3-scale-chromatic',
  'd3-interpolate',
  'd3-color',
  'd3-scale',
  'd3-array',
  'd3-format',
  'd3-time',
  'd3-time-format',
]) {
  mapper[`^${d}$`] = require.resolve(d).replace(`src${path.sep}index.js`, `dist${path.sep}/${d}.js`);
}

module.exports = {
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  testRegex: '/tests/.*\\.spec\\.(ts|tsx|js)$',
  moduleNameMapper: mapper,
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
};
