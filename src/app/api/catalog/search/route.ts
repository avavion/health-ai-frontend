import { api } from '@/lib/api/client';
import { handle } from '@/lib/api/route';
import type { BasePage } from '@/lib/api/types';

/**
 * Поиск по общей базе (§8.1).
 *
 * Приложение держит базу в памяти и ищет у себя; браузеру память устройства
 * недоступна, а выкачивать три тысячи позиций ради строки поиска — не тот
 * размен. Поэтому поиск идёт на сервере.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const query = new URL(request.url).searchParams.get('q') ?? '';
    if (query.trim().length < 2) return { items: [] };

    const page = await api<BasePage>({
      path: '/catalog/base/search',
      query: { q: query, limit: 20 },
    });
    return { items: page.items };
  });
}

export const dynamic = 'force-dynamic';
