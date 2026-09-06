import { NextResponse } from 'next/server';
import { ApiError, type ApiErrorDetail } from './client';

/**
 * Общая обвязка route handlers.
 *
 * Браузер разговаривает только со своим сервером, а тот — с API. Значит, у
 * сайта две границы ошибок, и на второй незачем изобретать свой формат:
 * ошибка контракта (§2) пересылается как есть, с тем же кодом и тем же
 * готовым к показу текстом.
 */

export interface RouteFailure {
  error: string;
  message: string;
  details?: ApiErrorDetail[];
  retry_after?: number | null;
}

/** Оборачивает обработчик: ошибки контракта превращаются в тот же конверт. */
export function handle<T>(operation: () => Promise<T>): Promise<Response> {
  return operation()
    .then((payload) =>
      payload === undefined || payload === null
        ? new NextResponse(null, { status: 204 })
        : NextResponse.json(payload),
    )
    .catch((error: unknown) => {
      if (error instanceof ApiError) {
        const body: RouteFailure = {
          error: error.code,
          message: error.message,
          details: error.details.length ? error.details : undefined,
          retry_after: error.retryAfter,
        };
        return NextResponse.json(body, { status: error.status });
      }

      // Сюда попадает то, чего мы не предвидели: разбор тела, обрыв сети до
      // API. Наружу уходит одно и то же — подробности остаются в логе сервера.
      console.error('[route]', error);
      const body: RouteFailure = {
        error: 'internal_error',
        message: 'Что-то пошло не так. Попробуйте ещё раз.',
      };
      return NextResponse.json(body, { status: 500 });
    });
}

/** Тело запроса от браузера. Неразобранное — это баг фронта, а не ввод человека. */
export async function readBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, 'malformed_json', 'Не удалось разобрать запрос.');
  }
}
