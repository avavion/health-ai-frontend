'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { Locale } from '@/i18n/config';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import type { Dictionary } from '@/i18n/dictionaries/ru';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import type { DayStripEntry } from '@/lib/api/screens';
import { shiftDate } from '@/lib/day';
import { DayStrip } from './DayStrip';
import { ShortcutsDialog } from './ShortcutsDialog';
import { SignOutButton } from './SignOutButton';
import styles from './shell.module.css';
import { route } from '@/lib/route';

export type ScreenKey = 'today' | 'entry' | 'catalog' | 'reports' | 'summary' | 'settings';

/** Пути экранов; N/T/P/R/I/S ведут сюда же. */
const paths: Record<ScreenKey, string> = {
  today: '',
  entry: '/entry',
  catalog: '/catalog',
  reports: '/reports',
  summary: '/summary',
  settings: '/settings',
};

const shortcutKeys: Record<string, ScreenKey> = {
  n: 'entry', t: 'today', p: 'catalog', r: 'reports', i: 'summary', s: 'settings',
};

export interface ShellDay {
  date: string;
  label: string;
}

export function AppShell({
  locale,
  screen,
  t,
  site,
  day,
  strip,
  today,
  userLabel,
  children,
}: {
  locale: Locale;
  screen: ScreenKey;
  t: AppDictionary;
  site: Dictionary;
  /** Выбранный день. Его нет на экранах, которые к дню не привязаны. */
  day?: ShellDay;
  strip?: DayStripEntry[];
  today?: string;
  userLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [helpOpen, setHelpOpen] = useState(false);
  const base = '/' + locale + '/app';

  /**
   * Выбранный день живёт в адресе, а не в состоянии страницы.
   *
   * Так его можно переслать ссылкой, вернуться к нему кнопкой «назад» и —
   * главное — собрать страницу на сервере уже с данными этого дня, без
   * промежуточного «сейчас загрузим».
   */
  const goToDate = (date: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', date);
    router.push(route(pathname + '?' + params.toString()));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (event.key === 'Escape') return setHelpOpen(false);
      if (typing) return;

      const key = event.key.toLowerCase();
      if (shortcutKeys[key]) {
        event.preventDefault();
        return router.push(route(base + paths[shortcutKeys[key] as ScreenKey]));
      }
      if (key === '?' || key === '/') {
        event.preventDefault();
        return setHelpOpen((open) => !open);
      }

      if (!day || !today) return;
      if (event.key === 'ArrowLeft') return goToDate(shiftDate(day.date, -1));
      if (event.key === 'ArrowRight') {
        const next = shiftDate(day.date, 1);
        // Завтра ещё не наступило: листать в будущее некуда.
        if (next <= today) goToDate(next);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // goToDate пересоздаётся на каждый рендер, но зависит только от адреса.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, day?.date, today, router, pathname, searchParams]);

  const navItems: ScreenKey[] = ['today', 'entry', 'catalog', 'reports', 'summary', 'settings'];
  const showDayStrip = (screen === 'today' || screen === 'reports') && !!strip && !!day;
  const isToday = day?.date === today;
  const title = screen === 'today' ? (isToday ? t.nav.today : (day?.label ?? t.nav.today)) : t.nav[screen];

  return (
    <div className={styles.root}>
      <input type="checkbox" id="ha-drawer" className={styles.drawerToggle} aria-hidden="true" />

      <aside className={styles.sidebar}>
        <div>
          <div className={styles.brand}>Health AI</div>
          <div className={styles.brandMeta}>{userLabel}</div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((key) => (
            <Link
              key={key}
              href={route(base + paths[key])}
              className={styles.navLink}
              aria-current={screen === key ? 'page' : undefined}
            >
              {t.nav[key]}
            </Link>
          ))}
        </nav>

        <Link className={'btn btn-primary ' + styles.write} href={route(base + '/entry')}>
          {t.shell.write}
        </Link>

        <div className={styles.sidebarFoot}>
          <p className={styles.healthNote}>{t.shell.healthNote}</p>
          <div className={styles.legalLinks}>
            <Link href={route('/' + locale + '/legal/privacy')}>{site.legal.privacy}</Link>
            <Link href={route('/' + locale + '/legal/data-collected')}>
              {site.legal['data-collected']}
            </Link>
            <Link href={route('/' + locale + '/legal/terms')}>{site.legal.terms}</Link>
          </div>
        </div>
      </aside>

      <label className={styles.scrim} htmlFor="ha-drawer" aria-label={t.shell.close}></label>

      <div className={styles.main}>
        <header className={styles.header}>
          <label className={styles.menuButton} htmlFor="ha-drawer" aria-label={t.shell.menu}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </label>

          <div className={styles.headerTitle}>
            <p className={'kicker tnum ' + styles.headerMeta}>
              {screen === 'today' || screen === 'reports' ? (day?.label ?? '') : ''}
            </p>
            <h1 className={styles.h1}>{title}</h1>
          </div>

          <div className={styles.headerTools}>
            {showDayStrip ? (
              <DayStrip
                strip={strip}
                date={day.date}
                today={today ?? day.date}
                onSelect={goToDate}
                t={t}
              />
            ) : null}
            <ThemeToggle />
            <button type="button" className="btn btn-ghost" onClick={() => setHelpOpen(true)}>
              {t.shell.shortcuts}
            </button>
            <SignOutButton locale={locale} label={t.shell.signOut} />
          </div>
        </header>

        <main className={styles.content} key={pathname + (day?.date ?? '')}>
          {children}
        </main>
      </div>

      {helpOpen ? <ShortcutsDialog t={t} onClose={() => setHelpOpen(false)} /> : null}
    </div>
  );
}
