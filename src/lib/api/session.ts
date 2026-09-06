/**
 * Сессия веб-клиента живёт в cookie, а не в localStorage.
 *
 * Причина одна и она решающая: токен, доступный скриптам страницы, уезжает
 * вместе с первой же XSS. httpOnly-cookie скрипт прочитать не может, а серверу
 * Next она приходит сама — именно он и ходит в API (см. lib/api/client).
 *
 * Отсюда же устройство разделения: браузер общается только со своим сервером,
 * а с API разговаривает сервер. Access-токен в браузер не попадает никогда.
 */

export const COOKIE_DEVICE = 'ha_device';
export const COOKIE_ACCESS = 'ha_access';
export const COOKIE_REFRESH = 'ha_refresh';
/** Момент истечения access-токена, unix-секунды. По нему middleware решает, пора ли обновляться. */
export const COOKIE_ACCESS_UNTIL = 'ha_access_until';
/**
 * Часовой пояс аккаунта (§3.1). День — понятие локальное, и без пояса «за
 * 4 сентября» означает разное для разных людей. Профиль его не отдаёт: пояс
 * живёт в аккаунте и приезжает один раз, при входе.
 */
export const COOKIE_TIMEZONE = 'ha_tz';

/** Заголовок, которым middleware передаёт серверным компонентам свежий токен. */
export const HEADER_ACCESS = 'x-ha-access';
/** Заголовок с идентификатором браузера — тем же, что уходит в X-Device-Id. */
export const HEADER_DEVICE = 'x-ha-device';

/** Refresh живёт 60 дней (§4), но cookie ставим на 59: истёкшую нечем отличить от стёртой. */
const REFRESH_MAX_AGE = 59 * 24 * 60 * 60;
/** Идентификатор браузера переживает выход из аккаунта: это устройство, а не сессия. */
const DEVICE_MAX_AGE = 365 * 24 * 60 * 60;

/** Токены, как их отдаёт §4.1 и §4.2. */
export interface SessionTokens {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in?: number;
}

/**
 * Минимум того, что умеет и cookies() в route handler, и NextResponse.cookies
 * в middleware. Один тип вместо двух ветвлений в каждом месте записи.
 */
export interface CookieWriter {
  set(name: string, value: string, options?: Record<string, unknown>): unknown;
  delete?(name: string): unknown;
}

function baseOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    // Secure выключается только в разработке: по http браузер такую cookie
    // просто не примет, и локальный вход перестал бы работать.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

/** Записывает выданную API сессию в cookie. */
export function writeSession(store: CookieWriter, tokens: SessionTokens): void {
  const options = baseOptions();

  store.set(COOKIE_ACCESS, tokens.access_token, {
    ...options,
    // Cookie переживает сам токен на минуту: иначе истёкший access исчезает
    // раньше, чем middleware успевает по нему понять, что пора обновляться.
    maxAge: tokens.expires_in + 60,
  });
  store.set(COOKIE_ACCESS_UNTIL, String(Math.floor(Date.now() / 1000) + tokens.expires_in), {
    ...options,
    maxAge: tokens.expires_in + 60,
  });
  store.set(COOKIE_REFRESH, tokens.refresh_token, {
    ...options,
    maxAge: tokens.refresh_expires_in ?? REFRESH_MAX_AGE,
  });
}

/** Часовой пояс аккаунта: живёт столько же, сколько refresh — до выхода. */
export function writeTimezone(store: CookieWriter, timezone: string): void {
  if (!timezone) return;
  store.set(COOKIE_TIMEZONE, timezone, {
    ...baseOptions(),
    // Не httpOnly: секрета здесь нет, а клиентским компонентам пояс нужен
    // ровно так же, как серверным.
    httpOnly: false,
    maxAge: REFRESH_MAX_AGE,
  });
}

/** Стирает сессию, оставляя идентификатор браузера: устройство никуда не делось. */
export function clearSession(store: CookieWriter): void {
  for (const name of [COOKIE_ACCESS, COOKIE_ACCESS_UNTIL, COOKIE_REFRESH, COOKIE_TIMEZONE]) {
    store.set(name, '', { ...baseOptions(), maxAge: 0 });
  }
}

/** Ставит идентификатор браузера, если его ещё нет. */
export function writeDeviceId(store: CookieWriter, deviceId: string): void {
  store.set(COOKIE_DEVICE, deviceId, { ...baseOptions(), maxAge: DEVICE_MAX_AGE });
}

/** Идентификатор браузера. UUID, как того требует §1 контракта. */
export function newDeviceId(): string {
  return crypto.randomUUID();
}

/** Осталось ли токену жить дольше запаса. Запас — чтобы он не истёк по дороге. */
export function accessIsFresh(until: string | undefined, marginSeconds = 60): boolean {
  if (!until) return false;
  const deadline = Number(until);
  if (!Number.isFinite(deadline)) return false;
  return deadline - marginSeconds > Math.floor(Date.now() / 1000);
}
