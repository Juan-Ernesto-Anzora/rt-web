// eslint.config.js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default tseslint.config(
  // ignores
  {
    ignores: ["dist", "node_modules"],
  },

  // base JS rules
  eslint.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // React (+ hooks + a11y) for TS/TSX
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: { react: { version: "detect" } },
    plugins: { react, "react-hooks": hooks, "jsx-a11y": jsxA11y },
    rules: {
      // React recommended (incluye JSX runtime moderno)
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,

      // Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: [
      "vite.config.*",
      "postcss.config.*",
      "tailwind.config.*",
      "*.cjs",
      "*.config.cjs",
      "*.config.js",
      "*.config.mjs",
    ],
    languageOptions: {
      globals: {
        ...globals.node, // habilita 'module', 'require', etc.
      },
      sourceType: "commonjs",
    },
    rules: {},
  }
);
