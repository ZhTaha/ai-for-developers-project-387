// ESLint flat config: CommonJS-бекенд/тесты и ESM-фронтенд со сгенерированным SDK.
const { defineConfig, globalIgnores } = require('eslint/config');
const globals = require('globals');

module.exports = defineConfig([
  globalIgnores(['node_modules/', 'public/generated/', 'dist/']),
  {
    files: ['src/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      eqeqeq: 'error',
    },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      eqeqeq: 'error',
    },
  },
]);
