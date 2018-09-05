module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: "tests/.*\\.spec\\.(ts|tsx|js)$",
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js'
  ],
  verbose: true,
  globals: {
    // 'ts-jest': {
    //   tsConfigFile: 'tsconfig_dev.json'
    // }
  }
};
