module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: "babel-eslint",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: [
    'react',
  ],
  rules: {
    // React ESLint
    "react/display-name": "off",
    "react/prop-types": "off",
    "react/no-unescaped-entities": "off",

    // Default ESLint
    "no-unused-vars": "warn",
    "no-prototype-builtins": "warn",
    "no-extra-semi": "warn",
    "no-dupe-class-members": "warn",
    "no-unreachable": "warn",
    "no-case-declarations": "warn",
    "no-useless-escape": "warn",
    "no-mixed-spaces-and-tabs": "warn",
    "no-irregular-whitespace": "warn",
    "no-useless-catch": "warn"
  },
};
