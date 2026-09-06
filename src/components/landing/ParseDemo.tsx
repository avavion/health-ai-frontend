import type { CSSProperties } from 'react';
import type { Dictionary } from '@/i18n/dictionaries/ru';
import styles from './parse-demo.module.css';

/** Кольцо: длина окружности при r=44 ≈ 277. Смещение = 277 * (1 - доля нормы). */
const MEALS = [
  { kcal: 412, ringOffset: 222, protein: 13, fat: 9, carbs: 71, bars: [22, 23, 79] },
  { kcal: 328, ringOffset: 233, protein: 6, fat: 18, carbs: 36, bars: [10, 45, 40] },
  { kcal: 596, ringOffset: 198, protein: 52, fat: 14, carbs: 63, bars: [87, 35, 70] },
] as const;

const CYCLE_SECONDS = 5;

export function ParseDemo({ t }: { t: Dictionary }) {
  const total = CYCLE_SECONDS * MEALS.length;

  return (
    <figure className={styles.card} aria-label={t.hero.demoKicker}>
      <figcaption className={styles.kicker}>{t.hero.demoKicker}</figcaption>

      {MEALS.map((meal, index) => {
        const demo = t.hero.demos[index];
        const delay = CYCLE_SECONDS * index + 's';
        const timing = { animationDuration: total + 's', animationDelay: delay };
        const macros = [
          { label: t.hero.protein, value: meal.protein, width: meal.bars[0] },
          { label: t.hero.fat, value: meal.fat, width: meal.bars[1] },
          { label: t.hero.carbs, value: meal.carbs, width: meal.bars[2] },
        ];

        return (
          <div className={styles.panel} style={timing} key={meal.kcal}>
            <p className={styles.phrase}>{demo?.phrase}</p>
            <hr className="hr" />

            <div className={styles.readout}>
              <div className={styles.ringWrap}>
                <svg viewBox="0 0 100 100" className={styles.ring} aria-hidden="true">
                  <circle cx="50" cy="50" r="44" className={styles.ringTrack} />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    className={styles.ringValue}
                    style={
                      { ...timing, '--ring-to': meal.ringOffset } as CSSProperties
                    }
                  />
                </svg>
                <div className={styles.ringLabel} style={timing}>
                  <span className={'tnum ' + styles.kcal}>{meal.kcal}</span>
                  <span className={styles.kcalUnit}>{t.hero.kcal}</span>
                </div>
              </div>

              <dl className={styles.macros}>
                {macros.map((macro) => (
                  <div className={styles.macro} key={macro.label}>
                    <div className={'tnum ' + styles.macroHead}>
                      <dt>{macro.label}</dt>
                      <dd style={timing}>
                        {macro.value} {t.hero.gram}
                      </dd>
                    </div>
                    <div className={styles.track}>
                      <div
                        className={styles.fill}
                        style={{ ...timing, width: macro.width + '%' }}
                      />
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <p className={styles.caption} style={timing}>
              {demo?.caption}
            </p>
          </div>
        );
      })}
    </figure>
  );
}
