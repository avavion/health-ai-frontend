export const supportTopics = [
  'app-question',
  'bug',
  'account-recovery',
  'account-deletion',
  'data-question',
  'other',
] as const;

export type SupportTopic = (typeof supportTopics)[number];

export interface SupportRequest {
  name?: string;
  email: string;
  topic: SupportTopic;
  message: string;
  consent: true;
  locale: string;
  /** Заполняется на клиенте, помогает разбирать баги. */
  userAgent?: string;
  appVersion?: string;
}

export type SupportResponse =
  | { status: 'accepted'; ticket: string }
  | { status: 'error'; message: string; fields?: Record<string, string> };

export function validateSupportRequest(input: unknown): {
  ok: boolean;
  fields: Record<string, string>;
  value?: SupportRequest;
} {
  const fields: Record<string, string> = {};
  const body = (input ?? {}) as Partial<SupportRequest>;

  if (!body.email || !/.+@.+\..+/.test(body.email)) fields.email = 'invalid-email';
  if (!body.message || body.message.trim().length < 10) fields.message = 'too-short';
  if (!body.topic || !(supportTopics as readonly string[]).includes(body.topic))
    fields.topic = 'unknown-topic';
  if (body.consent !== true) fields.consent = 'required';

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, fields, value: body as SupportRequest };
}
