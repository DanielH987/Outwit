// ESLint 9 flat config. Uses typescript-eslint's recommended set plus react
// hooks/refresh. `npm run lint` enforces it.
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import js from '@eslint/js';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'server/dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The context file must export both the component and the hook; this is
      // intentionally component+hook co-located for the provider pattern.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Test files and the standalone server use targeted casts for payload
    // shapes; keep `any` allowed there but warn everywhere else.
    files: ['src/__tests__/**/*.ts', 'src/__tests__/**/*.tsx', 'server/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
