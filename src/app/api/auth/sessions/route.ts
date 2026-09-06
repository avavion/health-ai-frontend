import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';

/**
 * Отзыв сессий (§4.4): одной по идентификатору или всех, кроме текущей.
 *
 * DELETE с телом браузеры шлют неохотно, поэтому операция оформлена как POST
 * с полем `id`: отсутствие поля означает «все, кроме этой».
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<{ id?: string }>(request);

    if (body.id) {
      await api<null>({ path: '/auth/sessions/' + body.id, method: 'DELETE' });
    } else {
      await api<null>({ path: '/auth/sessions/revoke-all', method: 'POST' });
    }

    return { ok: true };
  });
}

export const dynamic = 'force-dynamic';
