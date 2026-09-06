import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';
import type { FoodResolveResult } from '@/lib/api/types';

/**
 * Разбор фразы о еде (§6.5).
 *
 * Задачный эндпоинт: промпт, схема ответа и починка ответа модели живут на
 * бэкенде. Сайт шлёт фрагменты и получает позиции с граммовкой — ровно то же,
 * что делает приложение.
 *
 * Ключ идемпотентности обязателен: запрос тратит квоту (§11), и повтор по
 * таймауту не должен списывать её дважды. Ключ приходит от страницы: повтор
 * той же кнопкой обязан считаться тем же запросом, а новый разбор — новым.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody<{ fragments: string[]; requestId?: string; locale?: string }>(
      request,
    );

    const fragments = body.fragments.map((f) => f.trim()).filter(Boolean).slice(0, 20);
    if (fragments.length === 0) {
      return { items: [], unresolved_fragments: [], warnings: [], catalog_stale: false };
    }

    return api<FoodResolveResult>({
      path: '/ai/food/resolve',
      method: 'POST',
      idempotencyKey: body.requestId ?? crypto.randomUUID(),
      body: { fragments, options: { locale: body.locale ?? 'ru' } },
    });
  });
}

export const dynamic = 'force-dynamic';
