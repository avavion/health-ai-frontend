import { AppShell } from '@/components/app/AppShell';
import { Catalog } from '@/components/app/Catalog';
import { Entry } from '@/components/app/Entry';
import { Reports } from '@/components/app/Reports';
import { SettingsScreen } from '@/components/app/SettingsScreen';
import { Summary } from '@/components/app/Summary';
import { Today } from '@/components/app/Today';
import type { Locale } from '@/i18n/config';
import { getAppDictionary } from '@/i18n/get-app-dictionary';
import { getDictionary } from '@/i18n/get-dictionary';
import { loadDayScreen, loadReportsScreen, loadSummaryScreen } from '@/lib/api/screens';
import { loadPersonalCatalog, loadProfile, loadSessions, optional } from '@/lib/api/queries';
import { goalsOf } from '@/lib/day';

/**
 * Экраны приложения целиком: загрузка данных и оболочка вокруг.
 *
 * Общие для обеих локалей — страницы под /ru и /en только подставляют язык.
 * Держать шесть экранов в двух копиях значило бы править каждый дважды и
 * однажды забыть.
 */

/** Параметры адреса приходят в Next 15 обещанием: страница может начать рендер раньше. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function dateOf(params: Record<string, string | string[] | undefined>): string | undefined {
  const value = params.date;
  return typeof value === 'string' ? value : undefined;
}

export async function TodayScreen({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  const t = getAppDictionary(locale);
  const site = getDictionary(locale);
  const screen = await loadDayScreen(locale, dateOf(await searchParams));

  return (
    <AppShell
      locale={locale}
      screen="today"
      t={t}
      site={site}
      day={screen.day}
      strip={screen.strip}
      today={screen.today}
      userLabel={t.shell.webVersion}
    >
      <Today locale={locale} t={t} day={screen.day} goals={screen.goals} />
    </AppShell>
  );
}

export async function EntryScreen({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  const t = getAppDictionary(locale);
  const site = getDictionary(locale);
  const params = await searchParams;

  const [screen, personal] = await Promise.all([
    loadDayScreen(locale, dateOf(params)),
    optional(loadPersonalCatalog()),
  ]);

  return (
    <AppShell
      locale={locale}
      screen="entry"
      t={t}
      site={site}
      day={screen.day}
      today={screen.today}
      userLabel={t.shell.webVersion}
    >
      <Entry
        locale={locale}
        t={t}
        date={screen.day.date}
        isToday={screen.day.date === screen.today}
        personal={personal?.items ?? []}
        remaining={Math.max(0, screen.goals.kcal - screen.day.eaten)}
      />
    </AppShell>
  );
}

export async function CatalogScreen({ locale }: { locale: Locale }) {
  const t = getAppDictionary(locale);
  const site = getDictionary(locale);
  const personal = await optional(loadPersonalCatalog());

  return (
    <AppShell locale={locale} screen="catalog" t={t} site={site} userLabel={t.shell.webVersion}>
      <Catalog t={t} personal={personal?.items ?? []} />
    </AppShell>
  );
}

export async function ReportsScreen({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  const t = getAppDictionary(locale);
  const site = getDictionary(locale);
  const screen = await loadReportsScreen(locale, dateOf(await searchParams));

  return (
    <AppShell
      locale={locale}
      screen="reports"
      t={t}
      site={site}
      day={screen.day}
      strip={screen.strip}
      today={screen.today}
      userLabel={t.shell.webVersion}
    >
      <Reports
        locale={locale}
        t={t}
        day={screen.day}
        goals={screen.goals}
        reports={screen.reports}
        body={screen.body}
      />
    </AppShell>
  );
}

export async function SummaryScreen({ locale }: { locale: Locale }) {
  const t = getAppDictionary(locale);
  const site = getDictionary(locale);
  const screen = await loadSummaryScreen(locale);

  return (
    <AppShell locale={locale} screen="summary" t={t} site={site} userLabel={t.shell.webVersion}>
      <Summary
        locale={locale}
        t={t}
        days={screen.days}
        goals={screen.goals}
        today={screen.today}
      />
    </AppShell>
  );
}

export async function SettingsScreenPage({ locale }: { locale: Locale }) {
  const t = getAppDictionary(locale);
  const site = getDictionary(locale);

  const [profile, sessions] = await Promise.all([loadProfile(), optional(loadSessions())]);

  return (
    <AppShell locale={locale} screen="settings" t={t} site={site} userLabel={t.shell.webVersion}>
      <SettingsScreen
        locale={locale}
        t={t}
        site={site}
        profile={profile}
        goals={goalsOf(profile)}
        sessions={sessions ?? []}
      />
    </AppShell>
  );
}
