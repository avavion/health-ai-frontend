import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/*
 * Плоская конфигурация собрана из плагинов напрямую, а не через
 * eslint-config-next.
 *
 * Тот пакет до сих пор отдаёт конфигурацию в старом формате и подтягивает
 * @rushstack/eslint-patch, который на ESLint 9.39 отказывается работать
 * («Failed to patch ESLint»). Нужные правила живут в самих плагинах, и
 * подключить их прямо — короче, чем чинить патч.
 */
export default [
  { ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Неиспользованное с подчёркиванием — намеренно: так помечают
      // параметры, которых требует сигнатура, но не требует тело.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  prettier,
];
