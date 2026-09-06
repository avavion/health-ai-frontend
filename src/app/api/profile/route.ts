import { api } from '@/lib/api/client';
import { handle, readBody } from '@/lib/api/route';
import type { Profile } from '@/lib/api/types';

/**
 * Частичное обновление профиля (§5.2).
 *
 * Тело пересылается как есть: у профиля своя семантика `null` против
 * отсутствия поля — `custom_goals.kcal: null` снимает ручное значение, а
 * отсутствие поля оставляет его как есть. Любая «нормализация» по дороге эту
 * разницу стёрла бы.
 */
export async function PATCH(request: Request) {
  return handle(async () => {
    const body = await readBody<Record<string, unknown>>(request);
    return api<Profile>({ path: '/me/profile', method: 'PATCH', body });
  });
}

export const dynamic = 'force-dynamic';
