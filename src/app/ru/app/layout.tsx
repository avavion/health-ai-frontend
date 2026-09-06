import type { ReactNode } from 'react';

/**
 * Оболочка приложения. Состояния здесь больше нет: выбранный день живёт в
 * адресе, а данные собираются на сервере — делить между экранами нечего.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return children;
}
