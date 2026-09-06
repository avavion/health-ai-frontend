import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/ru';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import styles from './header.module.css';
import { route } from '@/lib/route';

export function SiteHeader({
  locale,
  t,
  variant = 'landing',
}: {
  locale: Locale;
  t: Dictionary;
  variant?: 'landing' | 'legal';
}) {
  const home = '/' + locale;
  const other: Locale = locale === 'ru' ? 'en' : 'ru';

  return (
    <header className={styles.bar}>
      <div className={'container ' + styles.inner}>
        <Link href={route(home)} className={styles.brand}>
          <Image
            className={styles.mark}
            src="/icon-192.png"
            alt=""
            width={28}
            height={28}
            priority
          />
          Health AI
        </Link>

        {variant === 'landing' ? (
          <nav className={styles.nav}>
            <a href="#features">{t.nav.features}</a>
            <a href="#compare">{t.nav.compare}</a>
            <a href="#free">{t.nav.price}</a>
            <a href="#support">{t.nav.support}</a>
            <Link href={route(home + '/app')}>{t.nav.webApp}</Link>
          </nav>
        ) : (
          <nav className={styles.nav}>
            <Link href={route(home + '/legal/privacy')}>{t.legal.privacy}</Link>
            <Link href={route(home + '/legal/data-collected')}>{t.legal['data-collected']}</Link>
            <Link href={route(home + '/legal/terms')}>{t.legal.terms}</Link>
          </nav>
        )}

        <div className={styles.tools}>
          <ThemeToggle />
          <Link className={styles.lang} href={route('/' + other)} hrefLang={other}>
            {other.toUpperCase()}
          </Link>
          {variant === 'landing' ? (
            <a className="btn btn-primary" href="#free">
              {t.nav.download}
            </a>
          ) : (
            <Link className="btn btn-secondary" href={route(home)}>
              {t.nav.home}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
