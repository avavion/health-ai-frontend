import { cookies } from 'next/headers';
import type { Locale } from '@/i18n/config';
import { buildDay, goalsOf, normalizeDate, shiftDate, today, type DayView } from '@/lib/day';
import {
  loadDiaryDays,
  loadHealthDays,
  loadMeals,
  loadProfile,
  loadReport,
  loadReports,
  optional,
} from './queries';
import { COOKIE_TIMEZONE } from './session';
import type { DiaryDay, Nutrients, Profile, ReportSummary } from './types';

/**
 * Сбор данных для экранов приложения.
 *
 * Между API и компонентами, а не внутри них: «Сегодня», «Разборы» и «Итоги»
 * показывают одни и те же цифры, и собирать их в трёх местах значило бы
 * получить три немного разных остатка на день.
 */

/** Сколько дней держит лента и таблица итогов. Месяц — столько же, сколько отчётов. */
export const WINDOW_DAYS = 30;

export interface DayStripEntry {
  date: string;
  weekday: string;
  dayOfMonth: number;
  hasEntries: boolean;
}

export interface DayScreen {
  profile: Profile;
  goals: Nutrients;
  timezone: string;
  today: string;
  day: DayView;
  strip: DayStripEntry[];
}

/** Экран дня: «Сегодня» и «Разборы» строятся из него же. */
export async function loadDayScreen(locale: Locale, dateParam?: string): Promise<DayScreen> {
  const profile = await loadProfile();
  const timezone = await accountTimezone();
  const now = today(timezone);
  const date = normalizeDate(dateParam, timezone);

  const [meals, health, reports, diaryDays] = await Promise.all([
    loadMeals(date, timezone),
    optional(loadHealthDays(date, date)),
    optional(loadReports(WINDOW_DAYS)),
    optional(loadDiaryDays(WINDOW_DAYS)),
  ]);

  const report = reports?.reports.find((item) => item.date === date) ?? null;

  return {
    profile,
    goals: goalsOf(profile),
    timezone,
    today: now,
    day: buildDay({
      date,
      locale,
      timezone,
      meals,
      health: health?.[0] ?? null,
      report,
    }),
    strip: buildStrip(now, diaryDays ?? [], locale),
  };
}

export interface ReportsScreen extends DayScreen {
  reports: ReportSummary[];
  /** Полный текст разбора за выбранный день. Его может не быть: ночь ещё не прошла. */
  body: string | null;
}

export async function loadReportsScreen(
  locale: Locale,
  dateParam?: string,
): Promise<ReportsScreen> {
  const screen = await loadDayScreen(locale, dateParam);
  const [reports, report] = await Promise.all([
    optional(loadReports(WINDOW_DAYS)),
    optional(loadReport(screen.day.date)),
  ]);

  return {
    ...screen,
    reports: reports?.reports ?? [],
    body: report?.body ?? null,
  };
}

export interface SummaryScreen {
  profile: Profile;
  goals: Nutrients;
  timezone: string;
  today: string;
  /** Дни окна от старых к свежим — так их читает и таблица, и график. */
  days: DayView[];
}

/**
 * Итоги за окно.
 *
 * Дни собираются из сводок дневника (§7.2) и агрегатов Здоровья (§9.2), а не
 * из полных приёмов пищи: на тридцати днях это тридцать запросов вместо двух,
 * а для графиков и таблицы позиции всё равно не нужны.
 */
export async function loadSummaryScreen(locale: Locale, days = WINDOW_DAYS): Promise<SummaryScreen> {
  const profile = await loadProfile();
  const timezone = await accountTimezone();
  const now = today(timezone);
  const from = shiftDate(now, -(days - 1));

  const [diaryDays, healthDays, reports] = await Promise.all([
    optional(loadDiaryDays(days)),
    optional(loadHealthDays(from, now)),
    optional(loadReports(days)),
  ]);

  const health = index(healthDays ?? [], (item) => item.date);
  const report = index(reports?.reports ?? [], (item) => item.date);
  const diary = index(diaryDays ?? [], (item) => item.date);

  const window: DayView[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = shiftDate(now, -offset);
    const summary = diary.get(date);

    window.push(
      withTotals(
        buildDay({
          date,
          locale,
          timezone,
          meals: [],
          health: health.get(date) ?? null,
          report: report.get(date) ?? null,
        }),
        summary,
      ),
    );
  }

  return { profile, goals: goalsOf(profile), timezone, today: now, days: window };
}

/**
 * Итоги дня из сводки дневника. buildDay считает их по позициям, но в этом
 * окне позиций нет — сводка приносит те же суммы одним запросом на все дни.
 */
function withTotals(day: DayView, summary: DiaryDay | undefined): DayView {
  if (!summary) return day;
  return {
    ...day,
    eaten: Math.round(summary.totals.kcal),
    protein: Math.round(summary.totals.protein),
    fat: Math.round(summary.totals.fat),
    carbs: Math.round(summary.totals.carbs),
    hasEntries: summary.meals > 0,
  };
}

/** Лента дней: последний месяц подряд, с отметкой, где есть записи. */
function buildStrip(now: string, diaryDays: DiaryDay[], locale: Locale): DayStripEntry[] {
  const written = new Set(diaryDays.filter((day) => day.meals > 0).map((day) => day.date));
  const strip: DayStripEntry[] = [];

  for (let offset = WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const date = shiftDate(now, -offset);
    strip.push({
      date,
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
        .format(new Date(date + 'T12:00:00Z'))
        .replace('.', '')
        .toUpperCase(),
      dayOfMonth: Number(date.slice(8, 10)),
      hasEntries: written.has(date),
    });
  }

  return strip;
}

/**
 * Часовой пояс аккаунта.
 *
 * Профиль его не отдаёт: пояс живёт в аккаунте (§3.1) и приезжает один раз,
 * при входе, — поэтому он в cookie. Запасной вариант — пояс сервера, а не
 * UTC: разница в три часа сдвинула бы границу дня.
 */
async function accountTimezone(): Promise<string> {
  const stored = (await cookies()).get(COOKIE_TIMEZONE)?.value;
  return stored || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function index<T>(items: T[], key: (item: T) => string): Map<string, T> {
  return new Map(items.map((item) => [key(item), item]));
}

/** Пустое состояние отличается от ошибки: за день просто ничего не записали. */
export function isEmptyDay(day: DayView): boolean {
  return !day.hasEntries;
}
