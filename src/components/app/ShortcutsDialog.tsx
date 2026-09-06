'use client';

import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import styles from './dialog.module.css';

export function ShortcutsDialog({ t, onClose }: { t: AppDictionary; onClose: () => void }) {
  return (
    <div className={styles.wrap} role="dialog" aria-modal="true" aria-label={t.shell.shortcuts}>
      <button type="button" className={styles.backdrop} onClick={onClose} aria-label={t.shell.close} />
      <div className={styles.panel}>
        <p className={'kicker tnum ' + styles.kicker}>{t.shell.keyboard}</p>
        <h3 className={styles.title}>{t.shell.shortcuts}</h3>
        <dl className={styles.rows}>
          {t.shortcuts.map(([what, key]) => (
            <div className={styles.row} key={key}>
              <dt>{what}</dt>
              <dd className={'tnum ' + styles.key}>{key}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.note}>{t.shell.shortcutsHint}</p>
        <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
          {t.shell.close}
        </button>
      </div>
    </div>
  );
}
