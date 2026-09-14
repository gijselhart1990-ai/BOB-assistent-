import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';

export default tseslint.config(
  { ignores: ['node_modules/**', '.next/**', '.netlify/**', 'next-env.d.ts'] },
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': next },
    rules: { ...next.configs.recommended.rules },
  },
  {
    files: ['app/(dash)/web/page.tsx', 'app/(dash)/koppelen/page.tsx'],
    // QR en screenshots zijn vluchtige data-URL's; image-optimalisatie is hier niet passend.
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    files: ['**/*.{ts,tsx,mjs}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
);
