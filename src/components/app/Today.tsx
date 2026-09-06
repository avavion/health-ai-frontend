import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import type { Nutrients } from '@/lib/api/types';
import type { DayView } from '@/lib/day';
import { fmt } from '@/lib/nutrition';
import styles from './screens.module.css';
import { route } from '@/lib/route';

/**
 * Экран дня. Серверный компонент: считать здесь нечего, а данные уже собраны
 * загрузчиком экрана — состояние в браузере только мешало бы кнопке «назад».
 */
export function Today({
  locale,
  t,
  day,
  goals,
}: {
  locale: Locale;
  t: AppDictionary;
  day: DayView;
  goals: Nutrients;
}) {
  const base = '/' + locale + '/app';

  if (!day.hasEntries) {
    return (
      <div className={styles.empty}>
        <p className={'kicker tnum ' + styles.panelKicker}>{day.label}</p>
        <h2 className={styles.emptyTitle}>{t.today.emptyTitle}</h2>
        <p className={styles.emptyBody}>
          {t.today.emptyBody} {fmt(goals.kcal)} {t.today.kcal}.
        </p>
        <Link className="btn btn-primary" href={route(base + '/entry?date=' + day.date)}>
          {t.today.emptyCta}
        </Link>
        <p className={styles.panelNote}>{t.today.emptyHint}</p>
      </div>
    );
  }

  const macros = [
    { label: t.today.protein, value: day.protein, goal: Math.round(goals.protein) },
    { label: t.today.fat, value: day.fat, goal: Math.round(goals.fat) },
    { label: t.today.carbs, value: day.carbs, goal: Math.round(goals.carbs) },
  ];

  const dash = (value: string | null) => value ?? t.today.noData;

  const activity = [
    { label: t.today.steps, value: dash(day.steps == null ? null : fmt(day.steps)) },
    {
      label: t.today.activeKcal,
      value: dash(day.active == null ? null : fmt(day.active) + ' ' + t.today.kcal),
    },
    {
      label: t.today.workouts,
      value: dash(
        day.exercise == null
          ? null
          : day.exercise > 0
            ? day.exercise + ' ' + t.today.minutes
            : t.today.noWorkouts,
      ),
    },
    { label: t.today.spent, value: dash(day.spent == null ? null : fmt(day.spent) + ' ' + t.today.kcal) },
  ];

  const dashOffset = 277 - 277 * Math.min(1, day.eaten / Math.max(1, goals.kcal));

  return (
    <div className={styles.columns}>
      <div className={styles.wide}>
        <div className={styles.dayHead}>
          <div className={styles.ringWrap}>
            <svg viewBox="0 0 100 100" className={styles.ring} aria-hidden="true">
              <circle cx="50" cy="50" r="44" className={styles.ringTrack} />
              <circle
                cx="50"
                cy="50"
                r="44"
                className={styles.ringValue}
                style={{ strokeDashoffset: dashOffset }}
              />
            </svg>
            <div className={styles.ringLabel}>
              <span className={'tnum ' + styles.ringNumber}>{fmt(day.eaten)}</span>
              <span className={styles.ringUnit}>
                {t.today.of} {fmt(goals.kcal)} {t.today.kcal}
              </span>
            </div>
          </div>

          <dl className={styles.macros}>
            {macros.map((macro) => (
              <div key={macro.label}>
                <div className={'tnum ' + styles.macroHead}>
                  <dt>{macro.label}</dt>
                  <dd className={macro.value > macro.goal ? styles.over : undefined}>
                    {macro.value} / {macro.goal} г
                  </dd>
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{
                      width:
                        Math.min(100, (macro.value / Math.max(1, macro.goal)) * 100).toFixed(1) + '%',
                    }}
                  />
                </div>
              </div>
            ))}
            <div className={'tnum ' + styles.remain}>
              <span>{t.today.remain}</span>
              <span className={styles.remainValue}>
                {fmt(Math.max(0, goals.kcal - day.eaten))} {t.today.kcal}
              </span>
            </div>
          </dl>
        </div>

        <section style={{ marginTop: 22 }}>
          <p className={'kicker tnum ' + styles.sectionLabel}>{t.today.meals}</p>
          {day.meals.map((meal) => (
            <div className={styles.meal} key={meal.id}>
              <div className={'tnum ' + styles.mealHead}>
                <span className={styles.mealType}>{t.mealTypes[meal.type]}</span>
                <span className={styles.mealTime}>{meal.time}</span>
                <span className={styles.mealKcal}>
                  {fmt(meal.kcal)} {t.today.kcal}
                </span>
              </div>
              {meal.items.map((item) => (
                <div className={'tnum ' + styles.mealItem} key={item.id}>
                  <span className={item.parsed ? styles.parsed : undefined}>
                    {item.name} · {fmt(item.grams)} г
                  </span>
                  <span>
                    {fmt(item.kcal)} {t.today.kcal}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <p className={styles.panelNote}>{t.today.parsedNote}</p>
        </section>
      </div>

      <div className={styles.side}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={'kicker tnum ' + styles.panelKicker}>{t.today.activity}</p>
            <span className={styles.mealTime}>{t.today.fromHealth}</span>
          </div>
          <dl className={styles.rows}>
            {activity.map((row) => (
              <div className={'tnum ' + styles.row} key={row.label}>
                <dt>{row.label}</dt>
                <dd className={styles.rowValue}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.panelNote}>
            {day.steps == null ? t.today.activityMissing : t.today.activityNote}
          </p>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={'kicker tnum ' + styles.panelKicker}>{t.today.dayReport}</p>
            {day.score != null ? <span className={'tnum ' + styles.score}>{day.score}</span> : null}
          </div>
          <p className={styles.summaryText}>{day.summary ?? t.today.reportPending}</p>
          {day.summary ? (
            <Link
              className="btn btn-secondary btn-block"
              href={route(base + '/reports?date=' + day.date)}
              style={{ marginTop: 14 }}
            >
              {t.today.openReport}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
