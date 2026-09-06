import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/api/meta';

/**
 * Проверка доступности сайта — то же, что `GET /health` у API (§1).
 *
 * Нужна выкатке: она поднимает новый цвет рядом с живым и обязана убедиться,
 * что отвечает именно он, а не прежний контейнер того же цвета, оставшийся на
 * порту. Кода ответа для этого мало — сверяется версия.
 *
 * Намеренно не ходит в API: этот адрес отвечает на вопрос «поднялся ли сайт»,
 * а не «здоров ли бэкенд». Смешав их, мы получили бы откат сайта из-за чужой
 * поломки — притом что лендинг и правовые страницы переживут её сами.
 */
export function GET() {
  return NextResponse.json(
    { status: 'ok', version: APP_VERSION },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export const dynamic = 'force-dynamic';
