'use client';

import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import styles from './states.module.css';
import { route } from '@/lib/route';

/**
 * Служебные состояния экрана.
 *
 * Раньше они переключались вручную в шапке — так их было видно в макете. Теперь
 * состояния настоящие: скелетон показывает Suspense, пока страница собирается
 * на сервере, ошибку — граница ошибок сегмента.
 */

export function ScreenSkeleton() {
  return (
    <div className={styles.skeleton}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={i === 0 ? styles.skeletonHero : styles.skeletonLine} />
      ))}
    </div>
  );
}

export function ScreenError({
  locale,
  t,
  code,
  onRetry,
}: {
  locale: Locale;
  t: AppDictionary;
  /** Код ошибки контракта или HTTP: человеку он ничего не говорит, поддержке — говорит всё. */
  code?: string;
  onRetry: () => void;
}) {
  return (
    <div className={styles.error}>
      <p className={'kicker tnum ' + styles.errorCode}>{code ?? t.states.errorCode}</p>
      <h2 className={styles.errorTitle}>{t.states.errorTitle}</h2>
      <p className={styles.errorBody}>{t.states.errorBody}</p>
      <div className={styles.errorActions}>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {t.states.retry}
        </button>
        <Link className="btn btn-secondary" href={route('/' + locale + '#support')}>
          {t.states.writeSupport}
        </Link>
      </div>
    </div>
  );
}
