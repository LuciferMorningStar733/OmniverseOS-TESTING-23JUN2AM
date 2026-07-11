/**
 * ESLint flat config (ESLint 9)
 * Used by `yarn lint` — separate from CRA/craco's internal build-time ESLint.
 *
 * Design goals:
 *   • Catch real bugs (react-hooks rules, clear errors)
 *   • Not re-flag things CRA's internal config already handles
 *   • Work correctly with React 17+ automatic JSX transform
 *   • Include Jest globals for *.test.js files
 */

const js         = require("@eslint/js");
const globals    = require("globals");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  // Base JS recommended rules
  js.configs.recommended,

  // ── Main source files ────────────────────────────────────────────────────
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: ["src/**/*.test.{js,jsx}", "src/setupTests.js", "src/reportWebVitals.js"],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion:  2022,
      sourceType:   "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // React 17+ automatic JSX transform doesn't need `import React`,
        // but some older files still import it — both patterns are valid.
        React:    "readonly",
        process:  "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // React Hooks — the most important rules to catch on CI
      "react-hooks/rules-of-hooks":  "error",
      "react-hooks/exhaustive-deps": "warn",

      // Quality: warn on unused imports/vars, don't error (pre-existing code)
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true }],

      // Downgrade to warn — pre-existing patterns throughout the codebase
      "no-empty":           ["warn", { allowEmptyCatch: true }],
      "no-useless-escape":  "warn",
      "no-useless-catch":   "warn",

      // Keep undef as warn (not error) so JSX global variables don't fail CI
      "no-undef": "warn",

      "no-console": "off",
    },
  },

  // ── Test files — add Jest globals ────────────────────────────────────────
  {
    files: ["src/**/*.test.{js,jsx}", "src/setupTests.{js,jsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType:  "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.jest,
        React: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "react-hooks/rules-of-hooks":  "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars":              "warn",
      "no-undef":                    "off", // Jest injects globals at runtime
      "no-empty":                    ["warn", { allowEmptyCatch: true }],
      "no-console":                  "off",
    },
  },

  // ── Ignore build artifacts ────────────────────────────────────────────────
  {
    ignores: ["build/**", "node_modules/**", "public/**"],
  },
];
