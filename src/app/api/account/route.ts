import { cookies } from 'next/headers';
import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';
import { clearSession } from '@/lib/api/session';

/**
 * Удаление аккаунта (§4.6).
 *
 * Ответ 202: доступ прекращается сразу, данные стираются через семь дней, и
 * всё это время удаление отменяется входом. Поэтому cookie здесь стираются —
 * человек вышел, — но сама возможность вернуться остаётся.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<{ password: string }>(request);

    const result = await api<{ deleted_after: string; message: string }>({
      path: '/auth/account',
      method: 'DELETE',
      body,
    });

    clearSession(await cookies());
    return result;
  });
}

export const dynamic = 'force-dynamic';
