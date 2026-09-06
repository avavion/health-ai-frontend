import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';

/** Новый код подтверждения (§3.3). Прежний перестаёт действовать. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<{ registration_token: string }>(request);
    return api<{ resend_after: number }>({
      path: '/auth/verify-email/resend',
      method: 'POST',
      auth: false,
      body,
    });
  });
}

export const dynamic = 'force-dynamic';
