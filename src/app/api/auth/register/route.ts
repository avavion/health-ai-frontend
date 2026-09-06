import { cookies } from 'next/headers';
import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';
import { writeSession, writeTimezone } from '@/lib/api/session';
import type { AuthResult, PendingRegistration } from '@/lib/api/types';

interface RegisterBody {
  email: string;
  password: string;
  display_name?: string;
  timezone: string;
  accepted_terms_version: string;
}

/**
 * Заявка на регистрацию (§3.1).
 *
 * Ключ идемпотентности обязателен: повтор по таймауту иначе стоил бы второго
 * письма с кодом. Ключ генерирует сервер — браузер о нём знать не обязан.
 *
 * Ответ различается по политике верификации (§3.0): при `required` приезжает
 * заявка и человек идёт вводить код, при `off` — сразу сессия. Страница
 * выбирает шаг по полю `stage`, а не по своим догадкам о настройке сервера.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<RegisterBody>(request);

    const result = await api<PendingRegistration | AuthResult>({
      path: '/auth/register',
      method: 'POST',
      auth: false,
      idempotencyKey: crypto.randomUUID(),
      body,
    });

    if ('session' in result) {
      const store = await cookies();
      writeSession(store, result.session);
      writeTimezone(store, result.user.timezone);
      return { stage: 'signed-in' as const };
    }

    return {
      stage: 'code' as const,
      registration_token: result.registration_token,
      email: result.email,
      code_length: result.code_length,
      resend_after: result.resend_after,
    };
  });
}

export const dynamic = 'force-dynamic';
