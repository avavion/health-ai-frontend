import { NextResponse } from 'next/server';
import { ApiError, api } from '@/lib/api/client';
import { validateSupportRequest, type SupportResponse } from '@/lib/support';

/**
 * Обращение в поддержку (§16.1).
 *
 * Идёт через свой сервер, а не прямо в API: так форма не зависит от CORS и не
 * раскрывает адрес API странице. Проверка ввода остаётся и здесь, и на
 * бэкенде — клиентской верить нельзя, а серверную видно человеку сразу.
 *
 * Свой формат ответа, а не конверт §2: форма показывает три состояния —
 * принято, поле не заполнено, не дошло, — и различать их по кодам ошибок
 * контракта ей незачем.
 */
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const { ok, fields, value } = validateSupportRequest(payload);

  if (!ok || !value) {
    const body: SupportResponse = { status: 'error', message: 'validation-failed', fields };
    return NextResponse.json(body, { status: 422 });
  }

  try {
    const upstream = await api<{ ticket: string }>({
      path: '/support/requests',
      method: 'POST',
      auth: false,
      body: value,
    });

    const body: SupportResponse = { status: 'accepted', ticket: upstream.ticket };
    return NextResponse.json(body, { status: 202 });
  } catch (error) {
    if (error instanceof ApiError) {
      // Серверная проверка увидела то, чего не увидела наша: подсветим поля
      // тем же способом, что и свою.
      if (error.status === 400 || error.status === 422) {
        const upstreamFields: Record<string, string> = {};
        for (const detail of error.details) {
          if (detail.field) upstreamFields[detail.field] = detail.code ?? 'invalid';
        }
        const body: SupportResponse = {
          status: 'error',
          message: error.message,
          fields: upstreamFields,
        };
        return NextResponse.json(body, { status: 422 });
      }

      const body: SupportResponse = { status: 'error', message: error.message };
      return NextResponse.json(body, { status: error.status === 429 ? 429 : 502 });
    }

    console.error('[support]', error);
    const body: SupportResponse = { status: 'error', message: 'upstream-unreachable' };
    return NextResponse.json(body, { status: 502 });
  }
}

export const dynamic = 'force-dynamic';
