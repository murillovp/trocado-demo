import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Only the React hooks rules for now (audit AH-02). Broader rules come one at a time.
export default tseslint.config({
  files: ['client/src/**/*.{ts,tsx}'],
  languageOptions: {
    parser: tseslint.parser,
    globals: globals.browser,
  },
  plugins: { 'react-hooks': reactHooks },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
});
