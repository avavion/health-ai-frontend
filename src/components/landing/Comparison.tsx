import type { Dictionary } from '@/i18n/dictionaries/ru';
import styles from './sections.module.css';

export function Comparison({ t }: { t: Dictionary }) {
  return (
    <section id="compare" className={styles.section}>
      <div className="container">
        <h2 className={styles.heading}>{t.compare.title}</h2>
        <p className={styles.lead}>{t.compare.lead}</p>

        <div className={styles.tableWrap}>
          <table className="table">
            <thead>
              <tr>
                <th>{t.compare.head.feature}</th>
                <th className={styles.colUs}>{t.compare.head.us}</th>
                <th className={styles.colThem}>{t.compare.head.them}</th>
              </tr>
            </thead>
            <tbody>
              {t.compare.rows.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
