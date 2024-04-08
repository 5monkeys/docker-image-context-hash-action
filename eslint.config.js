module.exports = [
  { ignores: ['**/dist/**'] },
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...require('globals').node
      }
    },
  },
  require('@eslint/js').configs.recommended,
  {
    files: [ 'src/*.test.js' ],
    ...require('eslint-plugin-jest').configs['flat/recommended'],
  },
  require('eslint-plugin-prettier/recommended'),
];
