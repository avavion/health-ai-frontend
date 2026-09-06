'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import type { Nutrients, ReportSummary } from '@/lib/api/types';
import type { DayView } from '@/lib/day';
import { formatDate } from '@/lib/day';
import type { Locale } from '@/i18n/config';
import { parseLegalMarkdown } from '@/lib/markdown';
import { LegalBlocks } from '@/components/legal/LegalBlocks';
import { fmt } from '@/lib/nutrition';
import styles from './screens.module.css';
import list from './report-list.module.css';
import { route } from '@/lib/route';

/**
 * Разборы: оглавление слева, разбор выбранного дня справа.
 *
 * Клиентский компонент ради одного — переключения дня в адресе. Сам разбор
 * приходит с сервера готовым: его текст пишет модель ночью, и собирать его
 * в браузере нечем.
 */
export function Reports({
  locale,
  t,
  day,
  goals,
  reports,
  body,
}: {
  locale: Locale;
  t: AppDictionary;
  day: DayView;
  goals: Nutrients;
  reports: ReportSummary[];
  body: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const select = (date: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', date);
    router.push(route(pathname + '?' + params.toString()));
  };

  const diff = day.spent == null ? null : day.eaten - day.spent;

  const rows = [
    { label: t.reports.eaten, value: fmt(day.eaten) + ' ' + t.today.kcal, accent: false },
    {
      label: t.reports.spent,
      value: day.spent == null ? t.today.noData : fmt(day.spent) + ' ' + t.today.kcal,
      accent: false,
    },
    {
      label: t.reports.diff,
      value:
        diff == null
          ? t.today.noData
          : (diff > 0 ? '+' : '−') + fmt(Math.abs(diff)) + ' ' + t.today.kcal,
      accent: true,
    },
    {
      label: t.reports.protein,
      value: day.protein + ' / ' + Math.round(goals.protein) + ' г',
      accent: false,
    },
    {
      label: t.reports.steps,
      value: day.steps == null ? t.today.noData : fmt(day.steps),
      accent: false,
    },
  ];

  return (
    <div className={styles.columns}>
      <div style={{ flex: '1 1 300px', minWidth: 0 }}>
        <p className={'kicker tnum ' + styles.sectionLabel}>{t.reports.index}</p>
        {reports.length === 0 ? <p className={styles.panelNote}>{t.reports.empty}</p> : null}
        {reports.map((entry) => (
          <button
            key={entry.date}
            type="button"
            className={list.item}
            aria-pressed={entry.date === day.date}
            onClick={() => select(entry.date)}
          >
            <span className={'tnum ' + list.date}>{formatDate(entry.date, locale)}</span>
            <span className={'tnum ' + list.score}>{entry.score ?? '—'}</span>
            <span className={list.excerpt}>{firstSentence(entry.summary)}</span>
          </button>
        ))}
      </div>

      <div
        className={styles.wide}
        style={{
          padding: '24px 26px',
          border: '1px solid var(--color-divider)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div className={list.head}>
          <div>
            <p className={'kicker tnum ' + styles.panelKicker}>{day.label}</p>
            <h2 className={list.title}>{t.reports.title}</h2>
          </div>
          {day.score != null ? <span className={'tnum ' + list.bigScore}>{day.score}</span> : null}
        </div>

        {day.summary ? (
          <p className={list.summary}>{day.summary}</p>
        ) : (
          <p className={styles.panelNote}>{t.reports.notReady}</p>
        )}

        <dl className={styles.rows} style={{ marginTop: 20 }}>
          {rows.map((row) => (
            <div className={'tnum ' + styles.row} key={row.label}>
              <dt>{row.label}</dt>
              <dd className={styles.rowValue + (row.accent ? ' ' + styles.over : '')}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Текст разбора приходит тем же Markdown-ом, что и правовые документы,
            и верстается тем же набором блоков: второй разбор разметки на сайте
            означал бы вторую карту того, что модели разрешено писать. */}
        {body ? <LegalBlocks blocks={parseLegalMarkdown(body)} /> : null}

        <p className={styles.panelNote}>{t.reports.note}</p>
      </div>
    </div>
  );
}

function firstSentence(text: string): string {
  const cut = text.split('.')[0] ?? text;
  return cut.endsWith('.') ? cut : cut + '.';
}
