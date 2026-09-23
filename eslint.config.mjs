import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'src/generated/'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['public/js/**/*.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
