import type { Dictionary } from '@/i18n/dictionaries/ru';
import styles from './sections.module.css';

export function Steps({ t }: { t: Dictionary }) {
  return (
    <section id="how" className={styles.section}>
      <div className="container">
        <h2 className={styles.heading}>{t.steps.title}</h2>
        <p className={styles.lead}>{t.steps.lead}</p>

        <ol className={styles.steps}>
          {t.steps.items.map((step, index) => (
            <li className={styles.step} key={step.title}>
              <span className={'tnum ' + styles.stepNumber}>
                {'0' + String(index + 1)}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.justified}>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
