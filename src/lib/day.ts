import type { Locale } from '@/i18n/config';
import type { HealthDay, Meal, MealType, Nutrients, Profile, ReportSummary } from './api/types';

/**
 * Сборка экрана дня из четырёх источников: дневник (§7), данные Здоровья (§9),
 * отчёт (§9.4) и цели из профиля (§5).
 *
 * Отдельным модулем, а не внутри компонентов: ровно эти же цифры показывают
 * «Сегодня», «Разборы» и «Итоги», и разъехавшийся расчёт остатка на трёх
 * экранах — вопрос времени, а не случайности.
 */

export interface MealItemView {
  id: string;
  name: string;
  grams: number;
  kcal: number;
  /** Позиция разобрана моделью, а не выбрана из каталога. Показывается курсивом. */
  parsed: boolean;
}

export interface MealView {
  id: string;
  type: MealType;
  /** Время приёма в часовом поясе человека, «08:05». */
  time: string;
  kcal: number;
  items: MealItemView[];
}

export interface DayView {
  /** Календарная дата, YYYY-MM-DD. */
  date: string;
  /** «ВТ» — для ленты дней. */
  weekday: string;
  /** «1 сентября» — для заголовка и списков. */
  dateLabel: string;
  /** «Вторник · 1 сентября» — надзаголовок экрана. */
  label: string;
  /** Число месяца без ведущего нуля — для ленты и календаря. */
  dayOfMonth: number;

  eaten: number;
  protein: number;
  fat: number;
  carbs: number;

  /** Всё, что пришло из Здоровья, может отсутствовать: браузер туда не ходит. */
  spent: number | null;
  steps: number | null;
  active: number | null;
  exercise: number | null;
  weight: number | null;

  score: number | null;
  summary: string | null;

  meals: MealView[];
  /** Есть ли за день хоть одна запись. По нему экран выбирает пустое состояние. */
  hasEntries: boolean;
}

/** Цели на день: ручные значения из профиля перекрывают расчётные (§5.1). */
export function goalsOf(profile: Profile): Nutrients {
  const computed = profile.computed.goals;
  const custom = profile.custom_goals;
  return {
    kcal: custom.kcal ?? computed.kcal,
    protein: custom.protein ?? computed.protein,
    fat: custom.fat ?? computed.fat,
    carbs: custom.carbs ?? computed.carbs,
  };
}

export interface DaySources {
  date: string;
  locale: Locale;
  timezone: string;
  meals: Meal[];
  health: HealthDay | null;
  report: ReportSummary | null;
}

export function buildDay(sources: DaySources): DayView {
  const { date, locale, timezone, meals, health, report } = sources;

  const totals = meals.reduce(
    (acc, meal) => {
      for (const item of meal.items) {
        acc.kcal += item.nutrients.kcal;
        acc.protein += item.nutrients.protein;
        acc.fat += item.nutrients.fat;
        acc.carbs += item.nutrients.carbs;
      }
      return acc;
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );

  const activity = health?.activity;
  // Потрачено за день — базовый обмен плюс активные калории: ровно то, что
  // показывает кольцо в «Здоровье». Если базового нет, складывать нечего:
  // одни активные калории — это не расход за день, и выдавать их за него
  // значило бы показать человеку вдвое меньшую цифру.
  const spent =
    activity?.basal_energy_kcal != null
      ? activity.basal_energy_kcal + (activity.active_energy_kcal ?? 0)
      : null;

  return {
    date,
    weekday: formatWeekday(date, locale),
    dateLabel: formatDate(date, locale),
    label: formatLabel(date, locale),
    dayOfMonth: Number(date.slice(8, 10)),

    eaten: Math.round(totals.kcal),
    protein: Math.round(totals.protein),
    fat: Math.round(totals.fat),
    carbs: Math.round(totals.carbs),

    spent: spent == null ? null : Math.round(spent),
    steps: activity?.steps ?? null,
    active: activity?.active_energy_kcal ?? null,
    exercise: activity?.exercise_minutes ?? null,
    weight: health?.body.weight_kg ?? null,

    score: report?.score ?? null,
    summary: report?.summary ?? null,

    meals: meals.map((meal) => buildMeal(meal, locale, timezone)),
    hasEntries: meals.length > 0,
  };
}

function buildMeal(meal: Meal, locale: Locale, timezone: string): MealView {
  const items = [...meal.items].sort((a, b) => a.sort_index - b.sort_index);

  return {
    id: meal.id,
    type: meal.meal_type,
    time: new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date(meal.eaten_at)),
    kcal: Math.round(items.reduce((sum, item) => sum + item.nutrients.kcal, 0)),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      grams: item.grams,
      kcal: Math.round(item.nutrients.kcal),
      // Разобранным считается всё, к чему приложил руку разбор: и оценка
      // модели, и найденный ею продукт каталога (§7.1).
      parsed: item.source === 'ai_estimate' || item.source === 'catalog_via_ai',
    })),
  };
}

/** Дата дня в часовом поясе человека: день — понятие локальное (§1). */
export function today(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/** Сдвиг календарной даты на несколько дней, без часовых поясов и переходов. */
export function shiftDate(date: string, days: number): string {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Дата валидна и не из будущего: адрес приходит из строки браузера. */
export function normalizeDate(value: string | undefined, timezone: string): string {
  const now = today(timezone);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return now;
  if (Number.isNaN(Date.parse(value + 'T12:00:00Z'))) return now;
  return value > now ? now : value;
}

function asDate(date: string): Date {
  // Полдень по UTC: в полночь дата в часовом поясе к западу от Гринвича
  // оказалась бы вчерашней.
  return new Date(date + 'T12:00:00Z');
}

/*
 * Календарную дату всегда форматируем в UTC: она уже приведена к часовому
 * поясу человека сервером, и второй перевод сдвинул бы её на сутки.
 */

export function formatWeekday(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
    .format(asDate(date))
    .replace('.', '')
    .toUpperCase();
}

export function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(asDate(date));
}

function formatLabel(date: string, locale: Locale): string {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
    asDate(date),
  );
  return weekday.charAt(0).toUpperCase() + weekday.slice(1) + ' · ' + formatDate(date, locale);
}
