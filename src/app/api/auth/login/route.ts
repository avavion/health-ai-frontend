import { cookies } from 'next/headers';
import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';
import { writeSession, writeTimezone } from '@/lib/api/session';
import type { AuthResult } from '@/lib/api/types';

/**
 * Вход (§4.1).
 *
 * Токены не доходят до браузера: сервер кладёт их в httpOnly-cookie и отдаёт
 * странице только то, что ей нужно показать. Токен, доступный скриптам,
 * уезжает вместе с первой же XSS.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<{ email: string; password: string }>(request);

    const result = await api<AuthResult>({
      path: '/auth/login',
      method: 'POST',
      auth: false,
      body: { email: body.email, password: body.password },
    });

    const store = await cookies();
    writeSession(store, result.session);
    writeTimezone(store, result.user.timezone);

    return { email: result.user.email, display_name: result.user.display_name };
  });
}

export const dynamic = 'force-dynamic';