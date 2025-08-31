module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-undef': 'error',
    'no-duplicate-imports': 'error',
    'no-unreachable': 'error',
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly',
  },
  overrides: [
    {
      files: ['**/*.test.js'],
      env: {
        jest: true,
      },
    },
  ],
};
