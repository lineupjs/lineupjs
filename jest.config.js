module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest'
  },
  testRegex: "tests/.*\\.spec\\.(ts|tsx|js)$",
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js'
  ],
  verbose: true,
  globals: {
    'ts-jest': {
      tsConfigFile: 'tsconfig.test.json',
      enableTsDiagnostics: true,
      skipBabel: true
    }
  }
};
