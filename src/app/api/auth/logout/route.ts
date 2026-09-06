import { cookies } from 'next/headers';
import { api, ApiError } from '@/lib/api/client';
import { handle } from '@/lib/api/route';
import { COOKIE_REFRESH, clearSession } from '@/lib/api/session';

/**
 * Выход (§4.3).
 *
 * Cookie стираются в любом случае — даже если API не ответил. Оставить
 * человека в аккаунте, из которого он попросил выйти, потому что не удалось
 * отозвать сессию на сервере, — не то поведение, которого от кнопки ждут.
 */
export async function POST() {
  return handle(async () => {
    const store = await cookies();
    const refresh = store.get(COOKIE_REFRESH)?.value;

    if (refresh) {
      try {
        await api<null>({
          path: '/auth/logout',
          method: 'POST',
          auth: false,
          body: { refresh_token: refresh },
        });
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
      }
    }

    clearSession(store);
    return { ok: true };
  });
}

export const dynamic = 'force-dynamic';
