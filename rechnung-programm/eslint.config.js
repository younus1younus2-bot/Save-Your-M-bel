import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'public/build/', 'demo/', 'data/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart']
    }
  },
  { files: ['src/client/**', 'src/shared/**'], languageOptions: { globals: { ...globals.browser, Chart: 'readonly' } } },
  { files: ['public/sw.js'], languageOptions: { sourceType: 'script', globals: { ...globals.serviceworker } } },
  { files: ['test/**'], languageOptions: { globals: { ...globals.node, ...globals.browser } } }
];
