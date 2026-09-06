import { cookies } from 'next/headers';
import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';
import { writeSession, writeTimezone } from '@/lib/api/session';
import type { AuthResult } from '@/lib/api/types';

/** Подтверждение почты кодом (§3.2): здесь создаётся аккаунт и выдаётся сессия. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<{ registration_token: string; code: string }>(request);

    const result = await api<AuthResult>({
      path: '/auth/verify-email',
      method: 'POST',
      auth: false,
      body,
    });

    const store = await cookies();
    writeSession(store, result.session);
    writeTimezone(store, result.user.timezone);

    return { email: result.user.email, profile_bootstrapped: result.profile_bootstrapped };
  });
}

export const dynamic = 'force-dynamic';
