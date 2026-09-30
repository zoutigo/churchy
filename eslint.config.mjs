import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.next-e2e/**',
      '**/.turbo/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      'archive/**',
      // Code généré par shadcn/ui
      'apps/web/src/components/ui/**',
      'apps/web/src/hooks/use-toast.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Les DTO validés par Zod sont typés `any` dans les contrôleurs Nest : on signale sans bloquer.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Fichiers de config / scripts CommonJS (jest, tailwind, scripts)
    files: ['**/*.js', '**/*.cjs', '**/*.config.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
