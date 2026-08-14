import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['node_modules/**', '.npm-cache/**', 'dist/**', 'lib/**'] },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    }
  }
];
