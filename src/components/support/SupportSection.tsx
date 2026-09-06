import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/ru';
import { SupportForm } from './SupportForm';
import styles from './support.module.css';

export function SupportSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <section id="support" className={styles.section}>
      <div className={'container ' + styles.inner}>
        <div>
          <p className="kicker">{t.support.kicker}</p>
          <h2 className={styles.heading}>{t.support.title}</h2>
          <p className={styles.lead}>{t.support.lead}</p>

          <dl className={styles.facts}>
            {t.support.facts.map(([label, value]) => (
              <div className={styles.fact} key={label}>
                <dt>{label}</dt>
                <dd className={styles.factValue}>{value}</dd>
              </div>
            ))}
          </dl>

          <p className={styles.hint}>{t.support.hint}</p>
        </div>

        <SupportForm locale={locale} t={t.support.form} privacyHref={'/' + locale + '/legal/privacy'} />
      </div>
    </section>
  );
}
