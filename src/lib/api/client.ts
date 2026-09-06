import { cookies, headers } from 'next/headers';
import { env } from '@/lib/env';
import { defaultLocale, isLocale, type Locale } from '@/i18n/config';
import { COOKIE_ACCESS, COOKIE_DEVICE, HEADER_ACCESS, HEADER_DEVICE } from './session';
import { APP_VERSION, CLIENT_PLATFORM } from './meta';

/**
 * Единственное место, где сайт разговаривает с API.
 *
 * Модуль серверный: его зовут серверные компоненты и route handlers. В браузер
 * он не попадает и попасть не должен — там нет ни токена, ни права его читать.
 *
 * Версия сайта уезжает в X-App-Version: строка сессии в списке устройств (§4.4)
 * собирается из этих заголовков, и без них веб-вход выглядел бы безымянным.
 */

export { APP_VERSION, CLIENT_PLATFORM };

/** Деталь ошибки из §2: по ней подсвечивается поле формы. */
export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message?: string;
  value?: unknown;
  attempts_left?: number;
}

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
    request_id?: string;
    retry_after?: number | null;
  };
}

/**
 * Ошибка контракта. `message` уже готов к показу человеку — §2 требует именно
 * этого, и собирать текст из кода на стороне сайта незачем.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
    readonly retryAfter: number | null = null,
    readonly requestId = '',
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Сессии нет или она умерла — человека надо вернуть на вход. */
  get isUnauthorized(): boolean {
    return this.code === 'token_invalid' || this.code === 'token_expired' || this.status === 401;
  }

  /** Ошибка конкретного поля, если сервер её назвал. */
  fieldError(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }
}

export interface ApiRequest {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Добавить Authorization. По умолчанию да: без токена работают только /auth/*, /legal и /support. */
  auth?: boolean;
  /** Ключ идемпотентности (§11). Обязателен для POST, создающих сущности или тратящих квоту. */
  idempotencyKey?: string;
  locale?: Locale;
  query?: Record<string, string | number | undefined>;
  /** Кэш Next. По умолчанию no-store: данные дневника у каждого свои. */
  cache?: RequestCache;
  revalidate?: number;
  tags?: string[];
  /** Явный токен — когда его только что выдали и в cookie он ещё не попал. */
  accessToken?: string;
  deviceId?: string;
}

/** Ответ без тела (204) приходит как null. */
export async function api<T>(request: ApiRequest): Promise<T> {
  const { response, text } = await call(request);

  if (!response.ok) throw toApiError(response, text);
  if (!text) return null as T;

  return JSON.parse(text) as T;
}

/** То же, но 404 отдаётся как null: экран показывает пустое состояние, а не ошибку. */
export async function apiOptional<T>(request: ApiRequest): Promise<T | null> {
  try {
    return await api<T>(request);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function call(request: ApiRequest): Promise<{ response: Response; text: string }> {
  const url = env.apiBaseUrl() + request.path + queryString(request.query);

  const init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    method: request.method ?? 'GET',
    headers: await buildHeaders(request),
  };

  if (request.body !== undefined) init.body = JSON.stringify(request.body);

  if (request.revalidate !== undefined || request.tags) {
    init.next = { revalidate: request.revalidate, tags: request.tags };
  } else {
    // Данные пользователя не кэшируются никогда: страница одного человека,
    // отданная другому, — не оптимизация, а утечка.
    init.cache = request.cache ?? 'no-store';
  }

  const response = await fetch(url, init);
  return { response, text: await response.text() };
}

async function buildHeaders(request: ApiRequest): Promise<Headers> {
  const result = new Headers({
    Accept: 'application/json',
    'Accept-Language': request.locale ?? (await currentLocale()),
    'X-App-Version': APP_VERSION,
    'X-Client-Platform': CLIENT_PLATFORM,
    'X-Device-Id': request.deviceId ?? (await currentDeviceId()),
  });

  if (request.body !== undefined) result.set('Content-Type', 'application/json');
  if (request.idempotencyKey) result.set('Idempotency-Key', request.idempotencyKey);

  // Имя устройства собирается из user-agent браузера: без него в списке
  // устройств (§4.4) веб-сессия остаётся безымянной строкой, и отличить свой
  // ноутбук от чужого входа по ней нельзя. Запросы без человека — чтение
  // правовых документов при пересборке — сюда не попадают: у них своё
  // устройство, и заголовков запроса у них нет.
  if (!request.deviceId) {
    const name = deviceNameOf((await headers()).get('user-agent'));
    if (name) result.set('X-Device-Name', headerValue(name));
  }

  if (request.auth !== false) {
    const token = request.accessToken ?? (await currentAccessToken());
    if (token) result.set('Authorization', 'Bearer ' + token);
  }

  return result;
}

/**
 * Свежий access-токен.
 *
 * Сначала заголовок от middleware: он обновляет токен до рендера и кладёт
 * новый сюда — в cookie запроса тот ещё старый, потому что браузер получит её
 * только вместе с ответом.
 */
async function currentAccessToken(): Promise<string | undefined> {
  const fromMiddleware = (await headers()).get(HEADER_ACCESS);
  if (fromMiddleware) return fromMiddleware;
  return (await cookies()).get(COOKIE_ACCESS)?.value;
}

async function currentDeviceId(): Promise<string> {
  const fromMiddleware = (await headers()).get(HEADER_DEVICE);
  if (fromMiddleware) return fromMiddleware;
  const fromCookie = (await cookies()).get(COOKIE_DEVICE)?.value;
  // Идентификатор ставит middleware; сюда попадаем только на маршрутах, куда
  // оно не заходит. Разовое значение лучше пустого заголовка: без X-Device-Id
  // API отвечает 400 (§1).
  return fromCookie ?? crypto.randomUUID();
}

async function currentLocale(): Promise<Locale> {
  const value = (await headers()).get('x-locale');
  return isLocale(value ?? '') ? (value as Locale) : defaultLocale;
}

function queryString(query: ApiRequest['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? '?' + encoded : '';
}

function toApiError(response: Response, text: string): ApiError {
  let envelope: ApiErrorEnvelope = {};
  try {
    envelope = text ? (JSON.parse(text) as ApiErrorEnvelope) : {};
  } catch {
    // Тело не разобралось — значит, отвечает не наш сервис: прокси, балансир
    // или страница ошибки хостинга. Сообщение ниже честнее пустой строки.
  }

  const error = envelope.error;
  return new ApiError(
    response.status,
    error?.code ?? 'network_error',
    error?.message ?? 'Сервис недоступен. Попробуйте ещё раз.',
    error?.details ?? [],
    error?.retry_after ?? null,
    error?.request_id ?? response.headers.get('X-Request-Id') ?? '',
  );
}

/**
 * Значение заголовка с не-ASCII знаками.
 *
 * fetch отправляет строку заголовка побайтно, трактуя её как Latin-1: «·»
 * уехал бы одним байтом 0xB7, а это не UTF-8 — сервер получил бы битую
 * строку и не смог записать её в базу. Поэтому текст кодируется в UTF-8
 * руками, а каждый байт становится своим знаком Latin-1: до сервера доезжают
 * ровно те байты, что мы имели в виду.
 */
function headerValue(text: string): string {
  return Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join('');
}

/**
 * Читаемое имя браузера: «Chrome · macOS».
 *
 * Разбор нарочно грубый — по подстрокам, без библиотеки. Имя нужно, чтобы
 * человек узнал свою строку в списке устройств, а не чтобы точно определить
 * сборку: ошибка здесь стоит неверной подписи, и только.
 */
function deviceNameOf(userAgent: string | null): string {
  if (!userAgent) return '';

  const browsers: [string, string][] = [
    ['Edg/', 'Edge'],
    ['OPR/', 'Opera'],
    ['Firefox/', 'Firefox'],
    // Chrome обязан проверяться раньше Safari: Chrome представляется и тем,
    // и другим, а Safari Chrome-ом — нет.
    ['Chrome/', 'Chrome'],
    ['Safari/', 'Safari'],
  ];
  const systems: [string, string][] = [
    ['Windows', 'Windows'],
    ['Android', 'Android'],
    ['iPhone', 'iPhone'],
    ['iPad', 'iPad'],
    ['Mac OS X', 'macOS'],
    ['Linux', 'Linux'],
  ];

  const browser = browsers.find(([marker]) => userAgent.includes(marker))?.[1];
  const system = systems.find(([marker]) => userAgent.includes(marker))?.[1];

  return [browser, system].filter(Boolean).join(' · ');
}
