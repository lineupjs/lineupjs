module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: "tests/.*\\.test\\.(ts|tsx|js)$",
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
