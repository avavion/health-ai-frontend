import { describe, expect, it } from 'vitest';
import { validateSupportRequest } from '@/lib/support';

const valid = {
  email: 'anna@example.ru',
  topic: 'bug' as const,
  message: 'Приложение падает при сохранении обеда.',
  consent: true as const,
  locale: 'ru',
};

describe('validateSupportRequest', () => {
  it('пропускает корректное обращение', () => {
    expect(validateSupportRequest(valid).ok).toBe(true);
  });

  it('требует почту, текст, тему и согласие', () => {
    const { ok, fields } = validateSupportRequest({});
    expect(ok).toBe(false);
    expect(Object.keys(fields).sort()).toEqual(['consent', 'email', 'message', 'topic']);
  });

  it('не принимает короткое сообщение', () => {
    const { fields } = validateSupportRequest({ ...valid, message: 'ошибка' });
    expect(fields.message).toBe('too-short');
  });
});
