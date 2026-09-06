'use client';

import { useState } from 'react';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import { MONTH_NAMES, MONTH_OF, WEEKDAYS, ageFrom, pluralYears } from '@/lib/nutrition';
import styles from './picker.module.css';

type Mode = 'day' | 'month' | 'year';

/**
 * Календарь выбора даты рождения. Три уровня — год, месяц, день, — потому что
 * листать месяцы по одному до 1996 года невозможно. Открывается окном по центру:
 * выпадающая панель обрезалась бы на коротких экранах.
 */
export function DatePicker({
  value,
  onChange,
  t,
  label,
}: {
  /** ISO-дата YYYY-MM-DD. */
  value: string;
  onChange: (iso: string) => void;
  t: AppDictionary;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('day');

  const [y, m, d] = value.split('-').map(Number);
  const year = y ?? 1996;
  const month = (m ?? 4) - 1;
  const day = d ?? 12;

  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);

  const now = new Date();
  const age = ageFrom(value, now);

  function toggle() {
    setOpen((prev) => !prev);
    setMode('day');
    setViewYear(year);
    setViewMonth(month);
  }

  function shift(direction: 1 | -1) {
    if (mode === 'day') {
      let nextMonth = viewMonth + direction;
      let nextYear = viewYear;
      if (nextMonth < 0) { nextMonth = 11; nextYear -= 1; }
      if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
      setViewMonth(nextMonth);
      setViewYear(nextYear);
      return;
    }
    setViewYear(viewYear + direction * (mode === 'month' ? 1 : 20));
  }

  function pick(dayNumber: number) {
    const iso =
      viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(dayNumber).padStart(2, '0');
    onChange(iso);
    setOpen(false);
  }

  const atLimit =
    mode === 'day'
      ? viewYear === now.getFullYear() && viewMonth >= now.getMonth()
      : mode === 'month'
        ? viewYear >= now.getFullYear()
        : Math.floor(viewYear / 20) * 20 + 20 > now.getFullYear();

  const lead = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const decadeStart = Math.floor(viewYear / 20) * 20;

  const backLabel =
    mode === 'day' ? t.auth.prevMonth : mode === 'month' ? t.auth.prevYear : t.auth.prevYears;
  const forwardLabel =
    mode === 'day' ? t.auth.nextMonth : mode === 'month' ? t.auth.nextYear : t.auth.nextYears;

  return (
    <div className="field" style={{ margin: 0 }}>
      <label htmlFor="ha-birth">{label}</label>
      <button
        type="button"
        id="ha-birth"
        className={'input ' + styles.field}
        aria-expanded={open}
        onClick={toggle}
      >
        <span>{day + ' ' + MONTH_OF[month] + ' ' + year}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.55">
          <rect x="3" y="5" width="18" height="16" rx="1" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      </button>

      {open ? (
        <div className={styles.wrap} role="dialog" aria-modal="true" aria-label={label}>
          <button type="button" className={styles.backdrop} onClick={() => setOpen(false)} aria-label={t.shell.close} />
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <p className={'kicker tnum ' + styles.panelKicker}>{label}</p>
              <span className={'tnum ' + styles.age}>{pluralYears(age)}</span>
            </div>

            <div className={styles.controls}>
              <button type="button" className={styles.arrow} onClick={() => shift(-1)} aria-label={backLabel}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <div className={styles.headButtons}>
                <button type="button" className={styles.monthButton} aria-pressed={mode === 'month'}
                  onClick={() => setMode('month')}>
                  {mode === 'year' ? t.auth.pickerYear : MONTH_NAMES[viewMonth]}
                </button>
                <button type="button" className={'tnum ' + styles.yearButton} aria-pressed={mode === 'year'}
                  onClick={() => setMode('year')}>
                  {mode === 'year' ? decadeStart + '–' + (decadeStart + 19) : viewYear}
                </button>
              </div>
              <button type="button" className={styles.arrow} onClick={() => shift(1)} aria-label={forwardLabel} disabled={atLimit}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {mode === 'day' ? (
              <div>
                <div className={styles.weekdays}>
                  {WEEKDAYS.map((w) => (
                    <div className={'tnum ' + styles.weekday} key={w}>{w}</div>
                  ))}
                </div>
                <div className={styles.days}>
                  {Array.from({ length: lead }, (_, i) => <div key={'lead-' + i} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((num) => {
                    const future =
                      viewYear === now.getFullYear() && viewMonth === now.getMonth() && num > now.getDate();
                    const active = num === day && viewMonth === month && viewYear === year;
                    return (
                      <button
                        key={num}
                        type="button"
                        className={'tnum ' + styles.day}
                        aria-pressed={active}
                        disabled={future}
                        onClick={() => pick(num)}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {mode === 'month' ? (
              <div className={styles.months}>
                {MONTH_NAMES.map((name, index) => (
                  <button key={name} type="button" className={styles.month} aria-pressed={index === viewMonth}
                    onClick={() => { setViewMonth(index); setMode('day'); }}>
                    {name.slice(0, 3)}
                  </button>
                ))}
              </div>
            ) : null}

            {mode === 'year' ? (
              <div className={styles.years}>
                {Array.from({ length: 20 }, (_, k) => decadeStart + k).map((item) => (
                  <button key={item} type="button" className={'tnum ' + styles.year}
                    aria-pressed={item === viewYear} disabled={item > now.getFullYear()}
                    onClick={() => { setViewYear(item); setMode('month'); }}>
                    {item}
                  </button>
                ))}
              </div>
            ) : null}

            <div className={styles.foot}>
              <span className={styles.footNote}>
                {mode === 'day'
                  ? t.auth.pickerChosen + ' ' + day + ' ' + MONTH_OF[month] + ' ' + year
                  : mode === 'month' ? t.auth.pickerPickMonth : t.auth.pickerPickYear}
              </span>
              <button type="button" className={'btn btn-ghost ' + styles.done} onClick={() => setOpen(false)}>
                {t.auth.pickerDone}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
