module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    'vue/setup-compiler-macros': true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    project: ['./tsconfig.eslint.json', './tsconfig.json'],
    extraFileExtensions: ['.vue'],
  },
  plugins: ['@typescript-eslint', 'vue'],
  rules: {
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export': 'off',
    'import/no-unresolved': 'off',
    'import/extensions': 'off',

    // Rules that conflict with @typescript-eslint/*
    indent: 'off',
    'no-undef': 'off',

    'max-len': ['error', { code: 140, ignoreStrings: true, ignoreTemplateLiterals: true }],
    'class-methods-use-this': 'warn',

    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      disallowTypeAnnotations: true,
      fixStyle: 'separate-type-imports',
    }],
    '@typescript-eslint/no-throw-literal': 'off',

    'vue/multi-word-component-names': 'off',
    'vue/valid-v-slot': ['error', {
      allowModifiers: true,
    }],
  },
};
