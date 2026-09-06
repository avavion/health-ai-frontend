import type { ReactNode } from 'react';
import type { LegalBlock } from '@/lib/markdown';
import { inlineToHtml } from '@/lib/markdown';
import styles from './legal.module.css';

/** Рендер блоков правового документа. Набор совпадает с картой 4c и с iOS. */
export function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  const rows: LegalBlock[] = [];
  const output: ReactNode[] = [];

  const flushRows = () => {
    if (rows.length === 0) return;
    output.push(
      <dl className={styles.rows} key={'rows-' + output.length}>
        {rows.map((row) =>
          row.kind === 'tableRow' ? (
            <div className={styles.row} key={row.label}>
              <dt>{row.label}</dt>
              <dd className={'tnum ' + styles.rowValue}>{row.value}</dd>
            </div>
          ) : null,
        )}
      </dl>,
    );
    rows.length = 0;
  };

  blocks.forEach((block, index) => {
    if (block.kind === 'tableRow') {
      rows.push(block);
      return;
    }
    flushRows();

    const key = block.kind + '-' + index;

    switch (block.kind) {
      case 'sectionHeading':
        output.push(
          <h2 className={styles.sectionHeading} key={key}>
            {block.text}
          </h2>,
        );
        break;
      case 'subheading':
        output.push(
          <h3 className={styles.subheading} key={key}>
            {block.text}
          </h3>,
        );
        break;
      case 'paragraph':
        output.push(
          <p
            className={styles.paragraph}
            key={key}
            dangerouslySetInnerHTML={{ __html: inlineToHtml(block.text) }}
          />,
        );
        break;
      case 'numbered':
        output.push(
          <p className={styles.numbered} key={key}>
            <span className={'tnum ' + styles.number}>{block.number}</span>
            <span dangerouslySetInnerHTML={{ __html: inlineToHtml(block.text) }} />
          </p>,
        );
        break;
      case 'bullet':
        output.push(
          <p className={styles.bullet} key={key}>
            <span dangerouslySetInnerHTML={{ __html: inlineToHtml(block.text) }} />
          </p>,
        );
        break;
      case 'quote':
        output.push(
          <blockquote className={styles.quote} key={key}>
            {block.text}
          </blockquote>,
        );
        break;
      case 'rule':
        output.push(<hr className="hr" key={key} />);
        break;
    }
  });

  flushRows();
  return <article className={styles.body}>{output}</article>;
}
