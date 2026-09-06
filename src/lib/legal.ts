import { api } from './api/client';
import { SITE_DEVICE_ID } from './api/meta';
import { env } from './env';
import type { Locale } from '@/i18n/config';

/** Ровно тот контракт, что читает iOS: GET {API_BASE_URL}/legal/{slug} (§15.1). */
export interface LegalDocumentDto {
  slug: string;
  version: string;
  title: string;
  body_markdown: string;
  /**
   * Язык отданной редакции. Может отличаться от запрошенного: перевода может
   * не быть, и тогда приезжает русская редакция. Поле необязательное —
   * бэкенд без поддержки локалей его не пришлёт.
   */
  locale?: string;
}

export const legalSlugs = ['privacy', 'terms', 'data-collected'] as const;
export type LegalSlug = (typeof legalSlugs)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (legalSlugs as readonly string[]).includes(value);
}

/**
 * Документ с бэкенда.
 *
 * Через общий клиент, а не голым fetch: маршрут живёт под /v1 и требует
 * заголовков §1 — без X-Device-Id API отвечает 400, и страница молча
 * показывала бы заглушку.
 *
 * ISR держится на час, но каждый обход перепроверяет ответ по ETag: правка
 * редакции не должна ждать сутки, а отдавать документ заново на каждый заход
 * незачем — он меняется несколько раз в год.
 */
export function fetchLegalDocument(slug: LegalSlug, locale: Locale): Promise<LegalDocumentDto> {
  return api<LegalDocumentDto>({
    path: '/legal/' + slug,
    auth: false,
    locale,
    // Явные локаль и устройство вместо чтения cookie: документ одинаков для
    // всех, и обращение к заголовкам запроса лишило бы страницу статики.
    deviceId: SITE_DEVICE_ID,
    revalidate: env.legalRevalidate(),
    tags: ['legal', 'legal:' + slug],
  });
}
