import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';
import type { Meal } from '@/lib/api/types';

interface SaveBody {
  id: string;
  eaten_at: string;
  meal_type: Meal['meal_type'];
  raw_text: string;
  items: Meal['items'];
}

/**
 * Запись приёма пищи (§7.1).
 *
 * PUT, а не POST, и идентификатор генерирует клиент: дневник офлайн-первый,
 * запись существует до первой синхронизации, а повторная отправка того же
 * приёма пищи обязана быть безопасной.
 */
export async function PUT(request: Request) {
  return handle(async () => {
    const body = await readBody<SaveBody>(request);
    const { id, ...meal } = body;

    return api<{ id: string; updated_at: string; revision: number }>({
      path: '/diary/meals/' + id,
      method: 'PUT',
      body: { ...meal, client_updated_at: new Date().toISOString() },
    });
  });
}

/** Удаление приёма пищи (§7.2). Мягкое: запись становится tombstone. */
export async function DELETE(request: Request) {
  return handle(async () => {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return { ok: true };

    await api<null>({ path: '/diary/meals/' + id, method: 'DELETE' });
    return { ok: true };
  });
}

export const dynamic = 'force-dynamic';
