// @ts-check

import eslint from '@eslint/js';
import eslintPluginVitest from 'eslint-plugin-vitest';
import json from 'eslint-plugin-json';
import globals from 'globals';

export default [
  {
    name: 'base',
    ignores: ['**/node_modules/**', '**/dist/**', '**/built/**'],
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
    name: 'vitest/recommended',
    files: ['**/*.test.{js,ts}'],
    ignores: ['**/*.json'],
    ...eslintPluginVitest.configs['flat/recommended'],
    languageOptions: {
      globals: {
        ...eslintPluginVitest.environments.env.globals,
      },
    },
  },
  {
    name: 'json/recommended-with-comments',
    files: ['**/*.json'],
    ...json.configs['recommended'],
    rules: {
      'json/*': ['warn', { allowComments: false }],
    },
  },
];
