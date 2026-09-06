/* Разбор правового Markdown. Порт LegalMarkdownParser.swift из iOS-репозитория:
   набор блоков закрыт намеренно и совпадает с картой 4c, всё неизвестное
   выводится абзацем, а не пропускается. */

export type LegalBlock =
  | { kind: 'sectionHeading'; text: string }
  | { kind: 'subheading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'numbered'; number: number; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'tableRow'; label: string; value: string }
  | { kind: 'rule' };

const NUMBERED = /^(\d+)[.)]\s+(.*)$/;

export function parseLegalMarkdown(markdown: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() });
    paragraph = [];
  };

  for (const raw of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();

    if (line === '') {
      flush();
    } else if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
      flush();
      blocks.push({ kind: 'rule' });
    } else if (line.startsWith('### ')) {
      flush();
      blocks.push({ kind: 'subheading', text: line.slice(4).trim() });
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ kind: 'sectionHeading', text: line.slice(3).trim() });
    } else if (line.startsWith('# ')) {
      flush();
      blocks.push({ kind: 'sectionHeading', text: line.slice(2).trim() });
    } else if (line.startsWith('> ')) {
      flush();
      blocks.push({ kind: 'quote', text: line.slice(2).trim() });
    } else if (line.startsWith('| ')) {
      const row = tableRow(line);
      flush();
      if (row) blocks.push(row);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      flush();
      blocks.push({ kind: 'bullet', text: line.slice(2).trim() });
    } else {
      const m = NUMBERED.exec(line);
      if (m && m[1] && m[2]) {
        flush();
        blocks.push({ kind: 'numbered', number: Number(m[1]), text: m[2].trim() });
      } else {
        paragraph.push(line);
      }
    }
  }

  flush();
  return blocks;
}

/** Строка вида "| Ответ на обращение | 48 часов |". Разделитель "---" отбрасывается. */
function tableRow(line: string): LegalBlock | null {
  const cells = line
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c !== '');
  if (cells.length < 2) return null;
  if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return null;
  const [label, value] = cells;
  if (!label || !value) return null;
  return { kind: 'tableRow', label, value };
}

/** Минимальный inline-разбор: **жирный** -> <strong>, *курсив* -> <em>. */
export function inlineToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}
