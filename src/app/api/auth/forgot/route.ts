import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';

/**
 * Запрос кода для смены пароля (§4.5).
 *
 * Ответ всегда одинаков, существует аккаунт или нет: иначе форма превратилась
 * бы в перечислитель зарегистрированных адресов.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<{ email: string }>(request);
    await api<null>({ path: '/auth/password/forgot', method: 'POST', auth: false, body });
    return { ok: true };
  });
}

export const dynamic = 'force-dynamic';
