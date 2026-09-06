'use client';

import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import type { DayStripEntry } from '@/lib/api/screens';
import { shiftDate } from '@/lib/day';
import styles from './day-strip.module.css';

/** Лента дней: ← 05 06 07 →. Окно из трёх клеток едет за выбранным днём. */
export function DayStrip({
  strip,
  date,
  today,
  onSelect,
  t,
}: {
  strip: DayStripEntry[];
  date: string;
  today: string;
  onSelect: (date: string) => void;
  t: AppDictionary;
}) {
  const current = Math.max(0, strip.findIndex((entry) => entry.date === date));
  const start = Math.max(0, Math.min(current - 1, strip.length - 3));
  const window = strip.slice(start, start + 3);

  const previous = shiftDate(date, -1);
  const next = shiftDate(date, 1);
  // Листать дальше начала ленты незачем: за её краем данных всё равно нет.
  const canGoBack = strip.length > 0 && previous >= (strip[0]?.date ?? previous);

  return (
    <div className={styles.strip}>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => onSelect(previous)}
        disabled={!canGoBack}
        aria-label={t.shell.previousDay}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>

      {window.map((entry) => (
        <button
          key={entry.date}
          type="button"
          className={styles.cell}
          aria-pressed={entry.date === date}
          // Дни без записей отличаются от заполненных: по ленте видно, где
          // дневник прерывался, и это ровно тот вопрос, с которым в неё лезут.
          data-empty={entry.hasEntries ? undefined : 'true'}
          onClick={() => onSelect(entry.date)}
        >
          <span className={'tnum ' + styles.num}>{String(entry.dayOfMonth).padStart(2, '0')}</span>
          <span className={styles.weekday}>{entry.weekday}</span>
        </button>
      ))}

      <button
        type="button"
        className={styles.arrow}
        onClick={() => onSelect(next)}
        disabled={next > today}
        aria-label={t.shell.nextDay}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
