import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, locales } from '@/i18n/config';
import { APP_VERSION } from '@/lib/api/meta';
import { refreshTokens } from '@/lib/api/refresh';
import {
  COOKIE_ACCESS,
  COOKIE_ACCESS_UNTIL,
  COOKIE_DEVICE,
  COOKIE_REFRESH,
  HEADER_ACCESS,
  HEADER_DEVICE,
  accessIsFresh,
  clearSession,
  newDeviceId,
  writeDeviceId,
  writeSession,
} from '@/lib/api/session';
import { env } from '@/lib/env';

/**
 * Middleware делает четыре вещи, и все четыре — до рендера, потому что после
 * него уже поздно: серверный компонент не может ни поставить cookie, ни увести
 * человека на другой адрес.
 *
 *   1. Заводит идентификатор браузера — он уезжает в X-Device-Id (§1) и делает
 *      веб-сессию видимой в списке устройств (§4.4).
 *   2. Обновляет access-токен, пока тот не истёк на середине рендера.
 *   3. Держит локаль в пути и кладёт её в заголовок для корневого layout.
 *   4. Не пускает в /app без сессии.
 *
 * Свежий токен уходит рендеру заголовком, а браузеру — cookie: в cookie
 * запроса он ещё старый, её браузер получит только вместе с ответом.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const deviceId = request.cookies.get(COOKIE_DEVICE)?.value ?? newDeviceId();
  const session = await ensureAccessToken(request, deviceId);

  const headers = new Headers(request.headers);
  headers.set(HEADER_DEVICE, deviceId);
  if (session.accessToken) headers.set(HEADER_ACCESS, session.accessToken);
  else headers.delete(HEADER_ACCESS);

  const finish = (response: NextResponse) => {
    if (!request.cookies.has(COOKIE_DEVICE)) writeDeviceId(response.cookies, deviceId);
    if (session.tokens) writeSession(response.cookies, session.tokens);
    if (session.expired) clearSession(response.cookies);
    return response;
  };

  // Route handlers локаль в пути не используют: они разговаривают с браузером
  // JSON-ом. Им нужны только заголовки и, если токен обновился, cookie.
  if (pathname.startsWith('/api/')) {
    return finish(NextResponse.next({ request: { headers } }));
  }

  const first = pathname.split('/')[1] ?? '';

  if (!isLocale(first)) {
    const header = request.headers.get('accept-language') ?? '';
    const preferred = locales.find((l) => header.toLowerCase().startsWith(l)) ?? defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = '/' + preferred + (pathname === '/' ? '' : pathname);
    return finish(NextResponse.redirect(url));
  }

  headers.set('x-locale', first);

  // Заслон приватных экранов. Проверяется наличие refresh-токена, а не
  // access: тот живёт пятнадцать минут, и человек, вернувшийся к вкладке
  // назавтра, оказался бы выброшенным на вход, хотя сессия жива.
  const isApp = pathname.startsWith('/' + first + '/app');
  if (isApp && !session.hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/' + first + '/login';
    // Куда человек шёл, туда его и вернём после входа.
    url.searchParams.set('next', pathname);
    return finish(NextResponse.redirect(url));
  }

  return finish(NextResponse.next({ request: { headers } }));
}

interface SessionState {
  accessToken?: string;
  /** Токены, которые надо записать в cookie: обмен только что состоялся. */
  tokens?: Awaited<ReturnType<typeof refreshTokens>>;
  /** Сессия отозвана или истекла — cookie надо стереть. */
  expired: boolean;
  hasSession: boolean;
}

async function ensureAccessToken(request: NextRequest, deviceId: string): Promise<SessionState> {
  const access = request.cookies.get(COOKIE_ACCESS)?.value;
  const until = request.cookies.get(COOKIE_ACCESS_UNTIL)?.value;
  const refresh = request.cookies.get(COOKIE_REFRESH)?.value;

  if (!refresh) return { expired: false, hasSession: false };
  if (access && accessIsFresh(until)) {
    return { accessToken: access, expired: false, hasSession: true };
  }

  const tokens = await refreshTokens(env.apiBaseUrl(), refresh, deviceId, APP_VERSION);

  // До API не достучались: сессия, скорее всего, жива. Отдаём то, что есть, —
  // истёкший токен вернёт 401, и это честнее выхода из аккаунта из-за
  // моргнувшей сети.
  if (tokens === undefined) {
    return { accessToken: access, expired: false, hasSession: true };
  }
  if (tokens === null) {
    return { expired: true, hasSession: false };
  }

  return { accessToken: tokens.access_token, tokens, expired: false, hasSession: true };
}

export const config = {
  // Статика и файлы с расширением проходят мимо: им не нужны ни локаль, ни
  // сессия, а лишний обмен токена на favicon.ico — это лишний обмен токена.
  matcher: ['/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};
