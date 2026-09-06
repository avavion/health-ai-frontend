import type { Dictionary } from '@/i18n/dictionaries/ru';
import styles from './free-plan.module.css';

export function FreePlan({ t }: { t: Dictionary }) {
  return (
    <section id="free" className={styles.band}>
      <span className={'tnum ' + styles.ghost} aria-hidden="true">
        0
      </span>

      <div className={'container ' + styles.inner}>
        <p className={styles.kicker}>{t.free.kicker}</p>
        <h2 className={styles.title}>{t.free.title}</h2>
        <p className={styles.lead}>{t.free.lead}</p>

        <dl className={styles.grid}>
          {t.free.items.map((item) => (
            <div className={styles.item} key={item.title}>
              <dt className={styles.itemTitle}>{item.title}</dt>
              <dd className={styles.itemBody}>{item.body}</dd>
            </div>
          ))}
        </dl>

        <div className={styles.actions}>
          <a className={'btn ' + styles.cta} href="#support">
            {t.free.cta}
          </a>
          <span className={styles.meta}>{t.free.meta}</span>
        </div>
      </div>
    </section>
  );
}
