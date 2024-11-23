// @ts-check

import eslint from "@eslint/js";
import eslintPluginJest from "eslint-plugin-jest";
import json from "eslint-plugin-json";
import globals from "globals";

export default [
  {
    name: "base",
    ignores: ["**/node_modules/**", "**/dist/**", "**/built/**"],
  },
  {
    name: "eslint/recommended-with-overrides",
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      ...eslint.configs.recommended.rules,
      "no-unused-vars": "warn",
      "no-undef": "warn",
    },
  },
  {
    name: "jest/recommended",
    files: ["**/*.test.{js,ts}"],
    ignores: ["**/*.json"],
    ...eslintPluginJest.configs["flat/recommended"],
  },
  {
    name: "json/recommended-with-comments",
    files: ["**/*.json"],
    ...json.configs["recommended"],
    rules: {
      "json/*": ["warn", { allowComments: false }],
    },
  },
];
