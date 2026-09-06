import type { Dictionary } from '@/i18n/dictionaries/ru';
import styles from './sections.module.css';

export function Features({ t }: { t: Dictionary }) {
  return (
    <section id="features" className={styles.section}>
      <div className="container">
        <h2 className={styles.heading}>{t.features.title}</h2>
        <div className={styles.cards}>
          {t.features.items.map((item) => (
            <article className="card" key={item.title}>
              <p className="card-kicker">{item.kicker}</p>
              <h3 className={'card-title ' + styles.cardTitle}>{item.title}</h3>
              <p className={'card-body ' + styles.cardBody}>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
