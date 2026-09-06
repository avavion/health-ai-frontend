import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { api } from '@/lib/api/client';
import { env } from '@/lib/env';
import { APP_VERSION, CLIENT_PLATFORM } from '@/lib/api/meta';
import { COOKIE_ACCESS, COOKIE_DEVICE, HEADER_ACCESS, HEADER_DEVICE } from '@/lib/api/session';

/**
 * Выгрузка данных (§12).
 *
 * Ссылка на архив требует той же авторизации, что и остальное API, а токен в
 * браузере не живёт — значит, качать архив должен сервер и отдавать его
 * человеку своим ответом. Прямая ссылка на API открылась бы без токена в
 * истории браузера и не сработала бы вовсе.
 *
 * Архив передаётся потоком: у активного пользователя дневник за год — это
 * мегабайты, и собирать их в память сайта незачем.
 */
export async function GET() {
  const ticket = await api<{ url: string; expires_at: string }>({
    path: '/me/export',
    method: 'GET',
  });

  const store = await cookies();
  const head = await headers();
  const accessToken = head.get(HEADER_ACCESS) ?? store.get(COOKIE_ACCESS)?.value ?? '';
  const deviceId = head.get(HEADER_DEVICE) ?? store.get(COOKIE_DEVICE)?.value ?? '';

  // Адрес приезжает от бэкенда с префиксом /v1, а API_BASE_URL его уже
  // содержит: берём корень, чтобы не получить /v1/v1.
  const base = env.apiBaseUrl().replace(/\/v1$/, '');

  const upstream = await fetch(base + ticket.url, {
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'X-Device-Id': deviceId,
      'X-App-Version': APP_VERSION,
      'X-Client-Platform': CLIENT_PLATFORM,
    },
    cache: 'no-store',
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: 'export_failed', message: 'Не удалось собрать выгрузку. Попробуйте ещё раз.' },
      { status: 502 },
    );
  }

  const filename = 'health-ai-export-' + new Date().toISOString().slice(0, 10) + '.json';

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
      'Cache-Control': 'no-store',
    },
  });
}

export const dynamic = 'force-dynamic';
