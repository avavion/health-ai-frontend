import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';

/**
 * Смена пароля по коду из письма (§4.5). Сессии не выдаёт: успешный сброс
 * отзывает все входы, и человек заходит заново — уже новым паролем.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<{ token: string; new_password: string }>(request);
    return api<{ revoked_sessions: number }>({
      path: '/auth/password/reset',
      method: 'POST',
      auth: false,
      body,
    });
  });
}

export const dynamic = 'force-dynamic';
