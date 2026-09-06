import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';

/** Смена пароля из настроек (§4.5). Отзывает все сессии, кроме текущей. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<{ current_password: string; new_password: string }>(request);
    await api<null>({ path: '/auth/password/change', method: 'POST', body });
    return { ok: true };
  });
}

export const dynamic = 'force-dynamic';
