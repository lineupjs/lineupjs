/* eslint-env node */

module.exports = {
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['react-app', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended', 'prettier'],
  settings: {
    react: {
      version: '99.99.99',
    },
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
};
