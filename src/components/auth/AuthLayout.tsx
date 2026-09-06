import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/ru';
import styles from './auth.module.css';
import { route } from '@/lib/route';

export function AuthLayout({
  locale,
  site,
  children,
}: {
  locale: Locale;
  site: Dictionary;
  children: ReactNode;
}) {
  return (
    <div className={styles.root}>
      <header className={styles.bar}>
        <Link className={styles.brand} href={route('/' + locale)}>Health AI</Link>
        <span className={styles.brandMeta}>веб-версия</span>
      </header>

      <div className={styles.body}>
        <div className={styles.card}>
          {children}
          <div className={styles.legal}>
            <Link href={route('/' + locale + '/legal/privacy')}>{site.legal.privacy}</Link>
            <Link href={route('/' + locale + '/legal/data-collected')}>{site.legal['data-collected']}</Link>
            <Link href={route('/' + locale + '/legal/terms')}>{site.legal.terms}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
