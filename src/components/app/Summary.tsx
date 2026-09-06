'use client';

import { useState } from 'react';
import type { Locale } from '@/i18n/config';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import type { Nutrients } from '@/lib/api/types';
import type { DayView } from '@/lib/day';
import { WEEKDAYS, fmt } from '@/lib/nutrition';
import styles from './screens.module.css';
import sum from './summary.module.css';

type SortKey = 'date' | 'kcal' | 'protein' | 'fat' | 'carbs' | 'score';

/** Отклонение, за которым день перестаёт считаться попавшим в норму. */
const NORM_TOLERANCE = 0.15;

/**
 * Итоги за период.
 *
 * Дни приходят с сервера окном в месяц; неделя — его хвост. Второй запрос ради
 * переключения периода не нужен: тридцать сводок весят меньше, чем ожидание
 * между кликом и графиком.
 */
export function Summary({
  locale,
  t,
  days,
  goals,
  today,
}: {
  locale: Locale;
  t: AppDictionary;
  /** От старых к свежим. */
  days: DayView[];
  goals: Nutrients;
  /** Сегодняшняя дата в поясе человека: по ней строится календарь месяца. */
  today: string;
}) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState(1);

  const window = period === 'week' ? days.slice(-7) : days;
  // В расчёт идут только дни с записями: пустой день — это не «ноль калорий»,
  // а отсутствие данных, и в среднем он занижал бы всё подряд.
  const written = window.filter((day) => day.hasEntries);

  const [cmpA, setCmpA] = useState(() => written[0]?.date ?? '');
  const [cmpB, setCmpB] = useState(() => written[written.length - 1]?.date ?? '');

  const avg = (pick: (day: DayView) => number | null) => {
    const values = written.map(pick).filter((value): value is number => value != null);
    if (values.length === 0) return null;
    return values.reduce((acc, value) => acc + value, 0) / values.length;
  };

  const inNorm = written.filter(
    (day) => Math.abs(day.eaten - goals.kcal) / goals.kcal <= NORM_TOLERANCE,
  ).length;

  const avgKcal = avg((day) => day.eaten);
  const avgProtein = avg((day) => day.protein);
  const avgScore = avg((day) => day.score);

  const dash = t.today.noData;
  const averages = [
    {
      label: t.summary.avgKcal,
      value: avgKcal == null ? dash : fmt(avgKcal),
      note: t.summary.norm + ' ' + fmt(goals.kcal),
    },
    {
      label: t.summary.protein,
      value: avgProtein == null ? dash : Math.round(avgProtein) + ' г',
      note: t.summary.norm + ' ' + Math.round(goals.protein) + ' г',
    },
    {
      label: t.summary.daysInNorm,
      value: inNorm + ' ' + t.summary.of + ' ' + (written.length || 0),
      note: t.summary.deviation,
    },
    {
      label: t.summary.score,
      value: avgScore == null ? dash : String(Math.round(avgScore)),
      note: period === 'week' ? t.summary.weekAvg : t.summary.monthAvg,
    },
  ];

  const maxBar = Math.max(...written.map((day) => day.eaten), goals.kcal, 1);

  const weights = window
    .map((day) => ({ date: day.date, weight: day.weight }))
    .filter((point): point is { date: string; weight: number } => point.weight != null);

  const heads: { key: SortKey; label: string; right: boolean }[] = [
    { key: 'date', label: t.summary.date, right: false },
    { key: 'kcal', label: t.catalog.kcal, right: true },
    { key: 'protein', label: 'Б', right: true },
    { key: 'fat', label: 'Ж', right: true },
    { key: 'carbs', label: 'У', right: true },
    { key: 'score', label: t.summary.score, right: true },
  ];

  const rows = [...written].sort((a, b) => {
    if (sortKey === 'date') return a.date.localeCompare(b.date) * sortDir;
    if (sortKey === 'score') return ((a.score ?? -1) - (b.score ?? -1)) * sortDir;
    if (sortKey === 'kcal') return (a.eaten - b.eaten) * sortDir;
    return (a[sortKey] - b[sortKey]) * sortDir;
  });

  const month = buildMonth(days, today);
  const monthName = capitalize(
    new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
      new Date(today + 'T12:00:00Z'),
    ),
  );

  const dayOf = (date: string) => written.find((day) => day.date === date);
  const a = dayOf(cmpA);
  const b = dayOf(cmpB);

  const compare =
    a && b
      ? [
          { label: t.summary.kcalRow, a: a.eaten, b: b.eaten },
          { label: t.summary.proteinRow, a: a.protein, b: b.protein },
          { label: t.summary.fatRow, a: a.fat, b: b.fat },
          { label: t.summary.carbsRow, a: a.carbs, b: b.carbs },
          { label: t.today.steps, a: a.steps ?? 0, b: b.steps ?? 0 },
          { label: t.summary.score, a: a.score ?? 0, b: b.score ?? 0 },
        ]
      : [];

  return (
    <div>
      <div className={sum.periodRow}>
        <div className={styles.chips}>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={period === 'week'}
            onClick={() => setPeriod('week')}
          >
            {t.summary.week}
          </button>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={period === 'month'}
            onClick={() => setPeriod('month')}
          >
            {t.summary.month}
          </button>
        </div>
        <span className={sum.periodMeta}>
          {t.summary.daysWithEntries} {written.length} {t.summary.of} {window.length}
        </span>
      </div>

      <div className={styles.columns}>
        <div className={styles.wide} style={{ flexBasis: 420 }}>
          <dl className={sum.averages}>
            {averages.map((item) => (
              <div className={sum.average} key={item.label}>
                <div className={sum.averageLabel}>{item.label}</div>
                <div className={'tnum ' + sum.averageValue}>{item.value}</div>
                <div className={sum.averageNote}>{item.note}</div>
              </div>
            ))}
          </dl>

          <section className={sum.block}>
            <p className={'kicker tnum ' + sum.blockLabel}>{t.summary.byDay}</p>
            <div className={sum.bars}>
              {window.map((day) => (
                <div className={sum.barSlot} key={day.date}>
                  <div
                    className={sum.bar}
                    data-over={
                      day.hasEntries &&
                      Math.abs(day.eaten - goals.kcal) / goals.kcal > NORM_TOLERANCE
                        ? 'true'
                        : undefined
                    }
                    style={{ height: ((day.eaten / maxBar) * 100).toFixed(1) + '%' }}
                  />
                </div>
              ))}
            </div>
            <div className={sum.barLabels}>
              {window.map((day) => (
                <div className={'tnum ' + sum.barLabel} key={day.date}>
                  {period === 'week' ? day.weekday : day.dayOfMonth}
                </div>
              ))}
            </div>
          </section>

          <section className={sum.block}>
            <p className={'kicker tnum ' + sum.blockLabel}>{t.summary.weight}</p>
            {weights.length < 2 ? (
              <p className={styles.panelNote}>{t.summary.weightMissing}</p>
            ) : (
              <>
                <svg viewBox="0 0 600 160" preserveAspectRatio="none" className={sum.weightChart}>
                  <line x1="0" y1="40" x2="600" y2="40" stroke="var(--color-divider)" />
                  <line x1="0" y1="80" x2="600" y2="80" stroke="var(--color-divider)" />
                  <line x1="0" y1="120" x2="600" y2="120" stroke="var(--color-divider)" />
                  <polyline
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                    points={weightPoints(weights.map((point) => point.weight))}
                  />
                </svg>
                <div className={'tnum ' + sum.weightScale}>
                  <span>{weights[0]?.weight.toFixed(1)} кг</span>
                  <span>{weights[weights.length - 1]?.weight.toFixed(1)} кг</span>
                </div>
              </>
            )}
          </section>

          <section className={sum.block}>
            <p className={'kicker tnum ' + sum.blockLabel}>{monthName}</p>
            <div className={sum.weekdays}>
              {WEEKDAYS.map((w) => (
                <div className={'tnum ' + sum.weekday} key={w}>
                  {w}
                </div>
              ))}
            </div>
            <div className={sum.calendar}>
              {Array.from({ length: month.offset }, (_, i) => (
                <div className={sum.blank} key={'blank-' + i} />
              ))}
              {month.cells.map((cell) => (
                <div
                  className={sum.cell}
                  key={cell.day}
                  data-empty={cell.score == null ? 'true' : undefined}
                  data-good={cell.score != null && cell.score >= 75 ? 'true' : undefined}
                  data-today={cell.isToday ? 'true' : undefined}
                >
                  <span className={'tnum ' + sum.cellNum}>{cell.day}</span>
                  <span className={'tnum ' + sum.cellScore}>{cell.score ?? ''}</span>
                </div>
              ))}
            </div>
            <p className={styles.panelNote}>{t.summary.calendarNote}</p>
          </section>

          <section className={sum.block}>
            <div className={sum.tableHead}>
              <p className={'kicker tnum ' + sum.blockLabel} style={{ margin: 0 }}>
                {t.summary.table}
              </p>
              <span className={sum.periodMeta}>{t.summary.sortHint}</span>
            </div>
            <div className={styles.tableWrap}>
              <table className="table">
                <thead>
                  <tr>
                    {heads.map((head) => (
                      <th
                        key={head.key}
                        className={(head.right ? styles.right + ' ' : '') + sum.sortHead}
                        aria-sort={
                          sortKey === head.key
                            ? sortDir > 0
                              ? 'ascending'
                              : 'descending'
                            : undefined
                        }
                        onClick={() => {
                          if (sortKey === head.key) setSortDir(-sortDir);
                          else {
                            setSortKey(head.key);
                            setSortDir(1);
                          }
                        }}
                      >
                        {head.label}
                        {sortKey === head.key ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.date}>
                      <td>{row.dateLabel}</td>
                      <td className={'tnum ' + styles.right}>{fmt(row.eaten)}</td>
                      <td className={'tnum ' + styles.right}>{row.protein}</td>
                      <td className={'tnum ' + styles.right}>{row.fat}</td>
                      <td className={'tnum ' + styles.right}>{row.carbs}</td>
                      <td className={'tnum ' + styles.right}>{row.score ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className={styles.side}>
          <div className={styles.panel}>
            <p className={'kicker tnum ' + styles.panelKicker} style={{ marginBottom: 12 }}>
              {t.summary.compare}
            </p>
            {compare.length === 0 ? (
              <p className={styles.panelNote}>{t.summary.compareMissing}</p>
            ) : (
              <>
                <div className={sum.compareSelects}>
                  <select
                    className="input"
                    value={cmpA}
                    onChange={(e) => setCmpA(e.target.value)}
                    aria-label={t.summary.compare}
                  >
                    {written.map((day) => (
                      <option value={day.date} key={day.date}>
                        {day.dateLabel}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={cmpB}
                    onChange={(e) => setCmpB(e.target.value)}
                    aria-label={t.summary.compare}
                  >
                    {written.map((day) => (
                      <option value={day.date} key={day.date}>
                        {day.dateLabel}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={sum.compareRows}>
                  {compare.map((row) => {
                    const diff = row.b - row.a;
                    return (
                      <div className={'tnum ' + sum.compareRow} key={row.label}>
                        <span className={sum.compareLabel}>{row.label}</span>
                        <span className={sum.compareValue}>{fmt(row.a)}</span>
                        <span className={sum.compareValue}>{fmt(row.b)}</span>
                        <span className={sum.compareDiff} data-zero={diff === 0 ? 'true' : undefined}>
                          {(diff > 0 ? '+' : diff < 0 ? '−' : '') + fmt(Math.abs(diff))}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className={styles.panelNote}>{t.summary.compareNote}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Полилиния веса в координатах 600×160 с полем сверху и снизу. */
function weightPoints(weights: number[]): string {
  const min = Math.min(...weights) - 0.4;
  const max = Math.max(...weights) + 0.4;
  const span = max - min || 1;

  return weights
    .map((weight, index) => {
      const x = weights.length === 1 ? 0 : (index / (weights.length - 1)) * 600;
      const y = 150 - ((weight - min) / span) * 140;
      return x.toFixed(0) + ',' + y.toFixed(1);
    })
    .join(' ');
}

interface MonthCell {
  day: number;
  score: number | null;
  isToday: boolean;
}

/**
 * Календарь текущего месяца с оценками.
 *
 * Неделя начинается с понедельника — так её читают там, где живёт продукт;
 * getUTCDay() считает от воскресенья, отсюда сдвиг на шесть.
 */
function buildMonth(days: DayView[], today: string): { offset: number; cells: MonthCell[] } {
  const scores = new Map(days.map((day) => [day.date, day.score]));
  const prefix = today.slice(0, 8);
  const first = new Date(today.slice(0, 8) + '01T12:00:00Z');
  const offset = (first.getUTCDay() + 6) % 7;

  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();

  const cells: MonthCell[] = [];
  for (let day = 1; day <= lastDay; day += 1) {
    const date = prefix + String(day).padStart(2, '0');
    cells.push({ day, score: scores.get(date) ?? null, isToday: date === today });
  }

  return { offset, cells };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
