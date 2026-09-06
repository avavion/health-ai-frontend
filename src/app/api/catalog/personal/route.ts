import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';
import type { PersonalItem } from '@/lib/api/types';

interface SaveBody {
  key: string;
  display_name: string;
  base_id?: string | null;
  per_100g: PersonalItem['per_100g'];
  default_serving_grams?: number | null;
}

/**
 * Запись в личный каталог (§8.2).
 *
 * `is_user_confirmed: true` — цифры набрал человек, и перезаписывать их
 * ответом модели или слиянием нельзя: ручная правка всегда главнее оценки.
 */
export async function PUT(request: Request) {
  return handle(async () => {
    const body = await readBody<SaveBody>(request);

    return api<PersonalItem>({
      path: '/catalog/personal/' + encodeURIComponent(body.key),
      method: 'PUT',
      body: {
        display_name: body.display_name,
        base_id: body.base_id ?? null,
        per_100g: body.per_100g,
        aliases: [],
        default_serving_grams: body.default_serving_grams ?? null,
        is_user_confirmed: true,
        client_updated_at: new Date().toISOString(),
      },
    });
  });
}

/** Удаление своей записи (§8.2). Дневник это не трогает: прошлые дни не переписываются. */
export async function DELETE(request: Request) {
  return handle(async () => {
    const key = new URL(request.url).searchParams.get('key');
    if (!key) return { ok: true };

    await api<null>({ path: '/catalog/personal/' + encodeURIComponent(key), method: 'DELETE' });
    return { ok: true };
  });
}

export const dynamic = 'force-dynamic';
