import { describe, expect, it } from 'vitest';
import { inlineToHtml, parseLegalMarkdown } from '@/lib/markdown';

describe('parseLegalMarkdown', () => {
  it('разбирает заголовки, абзацы и линии', () => {
    const blocks = parseLegalMarkdown('## 1 · Кто обрабатывает\n\nТекст абзаца.\n\n---');
    expect(blocks).toEqual([
      { kind: 'sectionHeading', text: '1 · Кто обрабатывает' },
      { kind: 'paragraph', text: 'Текст абзаца.' },
      { kind: 'rule' },
    ]);
  });

  it('склеивает перенесённые строки в один абзац', () => {
    const blocks = parseLegalMarkdown('Первая строка\nвторая строка');
    expect(blocks).toEqual([{ kind: 'paragraph', text: 'Первая строка вторая строка' }]);
  });

  it('читает нумерованные пункты и списки', () => {
    const blocks = parseLegalMarkdown('1. Первый\n- Пункт');
    expect(blocks).toEqual([
      { kind: 'numbered', number: 1, text: 'Первый' },
      { kind: 'bullet', text: 'Пункт' },
    ]);
  });

  it('читает строки таблицы и отбрасывает разделитель', () => {
    const blocks = parseLegalMarkdown('| Ответ | 48 часов |\n| --- | --- |');
    expect(blocks).toEqual([{ kind: 'tableRow', label: 'Ответ', value: '48 часов' }]);
  });

  it('выносит цитату во врезку', () => {
    expect(parseLegalMarkdown('> Важно')).toEqual([{ kind: 'quote', text: 'Важно' }]);
  });

  it('не теряет неизвестную разметку, а показывает её абзацем', () => {
    const blocks = parseLegalMarkdown('![схема](/a.png)');
    expect(blocks[0]?.kind).toBe('paragraph');
  });
});

describe('inlineToHtml', () => {
  it('экранирует html и размечает акценты', () => {
    expect(inlineToHtml('<b>**жирный**</b>')).toBe(
      '&lt;b&gt;<strong>жирный</strong>&lt;/b&gt;',
    );
  });
});
