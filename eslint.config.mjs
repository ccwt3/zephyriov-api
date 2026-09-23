import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'tools/auth-expo/.build/**', 'tools/auth-expo/android/**'] },
  ...tseslint.configs.recommended,
);
