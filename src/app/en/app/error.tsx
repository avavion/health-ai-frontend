'use client';

import { ScreenError } from '@/components/app/ScreenStates';
import { getAppDictionary } from '@/i18n/get-app-dictionary';

/**
 * Граница ошибок сегмента: сюда попадает всё, что не смог отдать API.
 * Раньше это состояние переключалось руками в шапке — теперь оно настоящее.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Показывается digest, а не текст ошибки: в проде Next текст скрывает, а
  // digest — то, по чему её находят в логе сервера.
  return (
    <ScreenError
      locale="en"
      t={getAppDictionary('en')}
      code={error.digest}
      onRetry={reset}
    />
  );
}
