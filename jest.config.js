module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest'
  },
  testRegex: "tests/.*\\.spec\\.(ts|tsx)$",
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js'
  ],
  verbose: true,
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.test.json',
      diagnostics: true,
      babelConfig: false
    }
  }
};
