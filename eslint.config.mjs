// @ts-check

import eslint from '@eslint/js';
import eslintPluginVitest from '@vitest/eslint-plugin';
import json from '@eslint/json';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    name: 'base',
    ignores: ['**/node_modules/**', '**/dist/**', '**/built/**', 'package-lock.json'],
  },
  {
    name: 'typescript',
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.node,
      },
    },
  },
  {
    name: 'eslint/recommended-with-overrides',
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...eslint.configs.recommended.rules,
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
    },
  },
  {
    files: ['**/*.test.{js,ts}'],
    ignores: ['**/*.json'],
    ...eslintPluginVitest.configs['recommended'],
    languageOptions: {
      globals: {
        ...eslintPluginVitest.environments.env.globals,
      },
    },
    rules: {
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'testAll'] }],
    },
  },
  {
    name: 'json/recommended',
    plugins: { json },
    language: 'json/json',
    files: ['**/*.json'],
    rules: {
      ...json.configs.recommended.rules,
    },
  },
];
