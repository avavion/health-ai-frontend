import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/ru';
import styles from './footer.module.css';
import { route } from '@/lib/route';

export function SiteFooter({ locale, t }: { locale: Locale; t: Dictionary }) {
  const base = '/' + locale + '/legal/';
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@healthai.app';

  return (
    <footer className={styles.footer}>
      <div className={'container ' + styles.inner}>
        <div>
          <div className={styles.brand}>Health AI</div>
          <p className={styles.tagline}>{t.footer.tagline}</p>
        </div>

        <nav className={styles.column} aria-label={t.footer.legal}>
          <Link href={route(base + 'privacy')}>{t.legal.privacy}</Link>
          <Link href={route(base + 'data-collected')}>{t.legal['data-collected']}</Link>
          <Link href={route(base + 'terms')}>{t.legal.terms}</Link>
        </nav>

        <div className={styles.column}>
          <Link href={route('/' + locale + '#support')}>{t.footer.support}</Link>
          <a href={'mailto:' + supportEmail}>{supportEmail}</a>
        </div>

        <p className={'tnum ' + styles.rights}>{t.footer.rights}</p>
      </div>
    </footer>
  );
}
