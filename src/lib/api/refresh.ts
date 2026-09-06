import type { SessionTokens } from './session';

/**
 * Обновление access-токена (§4.2) с защитой от одновременных попыток.
 *
 * Ротация обязательна: каждый вызов /auth/refresh возвращает новый
 * refresh-токен, а повторное предъявление использованного бэкенд трактует как
 * компрометацию и отзывает всю цепочку сессий. Для приложения это правило
 * означает «сериализуй обновление»; для сайта — на порядок строже, потому что
 * запросов в браузере несколько и приходят они одновременно:
 *
 *   - документ страницы и её route handlers обновляются параллельно;
 *   - запрос, вышедший до обновления, несёт cookie со старым токеном —
 *     браузер получит новую только вместе с ответом.
 *
 * Отсюда две карты. Первая склеивает одновременные попытки в одну. Вторая
 * помнит недавний обмен: пришедший следом запрос со старым токеном получает
 * готовый результат вместо повторного предъявления, за которое сессию отзовут.
 */

/**
 * Результат обмена: токены, `null` — сессии больше нет (вести на вход),
 * `undefined` — до API не достучались (сессия, скорее всего, жива, и выкидывать
 * человека из-за одной неудачной попытки нельзя).
 */
export type RefreshResult = SessionTokens | null | undefined;

const inflight = new Map<string, Promise<RefreshResult>>();
const recent = new Map<string, { tokens: RefreshResult; at: number }>();

/** Сколько помнить результат обмена. Дольше, чем живёт запрос, и куда короче токена. */
const RECENT_TTL_MS = 60_000;

export async function refreshTokens(
  apiBaseUrl: string,
  refreshToken: string,
  deviceId: string,
  appVersion: string,
): Promise<RefreshResult> {
  const remembered = recent.get(refreshToken);
  // Неудачу сети не запоминаем: следующий запрос имеет право попробовать снова.
  if (
    remembered &&
    remembered.tokens !== undefined &&
    Date.now() - remembered.at < RECENT_TTL_MS
  ) {
    return remembered.tokens;
  }

  const running = inflight.get(refreshToken);
  if (running) return running;

  const attempt = exchange(apiBaseUrl, refreshToken, deviceId, appVersion)
    .then((tokens) => {
      recent.set(refreshToken, { tokens, at: Date.now() });
      sweep();
      return tokens;
    })
    .finally(() => {
      inflight.delete(refreshToken);
    });

  inflight.set(refreshToken, attempt);
  return attempt;
}

async function exchange(
  apiBaseUrl: string,
  refreshToken: string,
  deviceId: string,
  appVersion: string,
): Promise<RefreshResult> {
  try {
    const response = await fetch(apiBaseUrl + '/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Device-Id': deviceId,
        'X-App-Version': appVersion,
        'X-Client-Platform': 'web',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });

    // Любой отказ означает, что сессии больше нет: и протухший токен, и
    // отозванная цепочка. Различать их незачем — человека в обоих случаях
    // ведут на вход.
    if (!response.ok) return null;

    return (await response.json()) as SessionTokens;
  } catch {
    // Сеть до API не дошла. Сессию не стираем: она, скорее всего, жива.
    return undefined;
  }
}

function sweep(): void {
  const deadline = Date.now() - RECENT_TTL_MS;
  for (const [token, entry] of recent) {
    if (entry.at < deadline) recent.delete(token);
  }
}
