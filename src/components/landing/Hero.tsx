import type { Dictionary } from '@/i18n/dictionaries/ru';
import { ParseDemo } from './ParseDemo';
import styles from './hero.module.css';

export function Hero({ t }: { t: Dictionary }) {
  return (
    <section className={'container ' + styles.hero}>
      <div className={styles.copy}>
        <p className={'kicker ' + styles.rise}>{t.hero.kicker}</p>
        <h1 className={styles.title}>
          {t.hero.titleTop}
          <br />
          <span className={styles.accent}>{t.hero.titleAccent}</span>
        </h1>
        <hr className={'hr ' + styles.rise} />
        <p className={styles.lead}>{t.hero.lead}</p>
        <div className={styles.actions}>
          <a className="btn btn-primary" href="#free">
            {t.hero.primary}
          </a>
          <a className="btn btn-secondary" href="#how">
            {t.hero.secondary}
          </a>
        </div>
        <p className={styles.note}>{t.hero.note}</p>
      </div>

      <ParseDemo t={t} />
    </section>
  );
}
