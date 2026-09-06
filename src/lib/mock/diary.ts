/**
 * Демонстрационные данные дневника. Ровно те же значения, что в макете
 * «Health AI - Web.dc.html», — чтобы код и согласованный дизайн не расходились.
 * Заменяется ответами API: см. docs/BACKEND-REQUEST.md.
 */

export interface MealItem {
  name: string;
  kcal: string;
  /** Позиция разобрана моделью из фразы, а не выбрана из каталога. */
  parsed: boolean;
}

export interface Meal {
  type: string;
  time: string;
  kcal: number;
  items: MealItem[];
}

export interface Day {
  weekday: string;
  date: string;
  label: string;
  eaten: number;
  spent: number;
  protein: number;
  fat: number;
  carbs: number;
  steps: number;
  active: number;
  exercise: number;
  score: number;
  weight: number;
  summary: string;
  meals: Meal[];
}

export const GOALS = { kcal: 2140, protein: 160, fat: 67, carbs: 205 } as const;

export const DAYS: Day[] = [
  {
    weekday: 'ВТ', date: '1 сентября', label: 'Вторник · 1 сентября',
    eaten: 2210, spent: 2380, protein: 142, fat: 71, carbs: 212,
    steps: 6240, active: 310, exercise: 0, score: 80, weight: 78.4,
    summary:
      'Хороший баланс, жиры чуть выше нормы. Белка почти в цель: 142 г при норме 160 — на весе 79 кг этого достаточно, чтобы не терять мышцы.',
    meals: [
      { type: 'Завтрак', time: '08:05', kcal: 512, items: [
        { name: 'Овсянка на воде · 260 г', kcal: '205 ккал', parsed: false },
        { name: 'Творог 5 % · 180 г', kcal: '218 ккал', parsed: false } ] },
      { type: 'Обед', time: '13:20', kcal: 786, items: [
        { name: 'Рис с курицей · 380 г', kcal: '598 ккал', parsed: false },
        { name: 'Хлеб бородинский · 60 г', kcal: '125 ккал', parsed: false } ] },
      { type: 'Ужин', time: '19:40', kcal: 912, items: [
        { name: 'Паста болоньезе · 420 г', kcal: '742 ккал', parsed: true },
        { name: 'Салат из огурцов · 150 г', kcal: '118 ккал', parsed: false } ] },
    ],
  },
  {
    weekday: 'СР', date: '2 сентября', label: 'Среда · 2 сентября',
    eaten: 1870, spent: 2740, protein: 128, fat: 58, carbs: 176,
    steps: 11420, active: 610, exercise: 68, score: 73, weight: 78.2,
    summary:
      'Две тренировки, еды под них не хватило — дефицит 870 ккал. Один такой день ничего не решает, но три подряд уже видны по весу и силе.',
    meals: [
      { type: 'Завтрак', time: '07:50', kcal: 430, items: [
        { name: 'Яйцо куриное · 3 шт', kcal: '233 ккал', parsed: false },
        { name: 'Хлеб бородинский · 95 г', kcal: '197 ккал', parsed: false } ] },
      { type: 'Обед', time: '14:10', kcal: 640, items: [
        { name: 'Гречка готовая · 220 г', kcal: '242 ккал', parsed: false },
        { name: 'Куриная грудка · 240 г', kcal: '396 ккал', parsed: false } ] },
      { type: 'Ужин', time: '20:30', kcal: 800, items: [
        { name: 'Творог 5 % · 200 г', kcal: '242 ккал', parsed: false },
        { name: 'Банан · 2 шт', kcal: '214 ккал', parsed: false },
        { name: 'Сырники · 180 г', kcal: '344 ккал', parsed: true } ] },
    ],
  },
  {
    weekday: 'ЧТ', date: '3 сентября', label: 'Четверг · 3 сентября',
    eaten: 2690, spent: 2410, protein: 74, fat: 96, carbs: 288,
    steps: 4980, active: 240, exercise: 0, score: 61, weight: 78.5,
    summary:
      'Углеводы сверх плана, белка меньше половины нормы. Пицца и печенье собрали две трети дневных калорий, шагов вышло меньше пяти тысяч.',
    meals: [
      { type: 'Обед', time: '13:00', kcal: 1240, items: [
        { name: 'Пицца пепперони · 380 г', kcal: '1 026 ккал', parsed: true },
        { name: 'Кола · 500 мл', kcal: '214 ккал', parsed: false } ] },
      { type: 'Перекус', time: '16:30', kcal: 420, items: [
        { name: 'Печенье овсяное · 90 г', kcal: '420 ккал', parsed: true } ] },
      { type: 'Ужин', time: '20:10', kcal: 1030, items: [
        { name: 'Рис с курицей · 340 г', kcal: '521 ккал', parsed: false },
        { name: 'Хлеб бородинский · 120 г', kcal: '250 ккал', parsed: false },
        { name: 'Йогурт Teos шоколадный · 290 г', kcal: '261 ккал', parsed: false } ] },
    ],
  },
  {
    weekday: 'ПТ', date: '4 сентября', label: 'Пятница · 4 сентября',
    eaten: 2104, spent: 2520, protein: 158, fat: 64, carbs: 198,
    steps: 9310, active: 430, exercise: 35, score: 84, weight: 78.1,
    summary:
      'Ровный день: норма выбрана почти точно, белка достаточно, жиры и углеводы в пределах отклонения. Такой день стоит запомнить как образец.',
    meals: [
      { type: 'Завтрак', time: '08:15', kcal: 468, items: [
        { name: 'Овсянка на воде · 240 г', kcal: '190 ккал', parsed: false },
        { name: 'Йогурт Teos шоколадный · 310 г', kcal: '279 ккал', parsed: false } ] },
      { type: 'Обед', time: '13:35', kcal: 742, items: [
        { name: 'Гречка готовая · 200 г', kcal: '220 ккал', parsed: false },
        { name: 'Стейк индейки · 220 г', kcal: '299 ккал', parsed: false },
        { name: 'Салат из огурцов · 200 г', kcal: '158 ккал', parsed: false } ] },
      { type: 'Ужин', time: '19:20', kcal: 894, items: [
        { name: 'Рис отварной · 280 г', kcal: '325 ккал', parsed: false },
        { name: 'Куриная грудка · 260 г', kcal: '429 ккал', parsed: false },
        { name: 'Банан · 1 шт', kcal: '107 ккал', parsed: false } ] },
    ],
  },
  {
    weekday: 'СБ', date: '5 сентября', label: 'Суббота · 5 сентября',
    eaten: 1528, spent: 2610, protein: 96, fat: 44, carbs: 148,
    steps: 8420, active: 486, exercise: 52, score: 78, weight: 77.9,
    summary:
      'Белка на весе хватает, углеводы почти в норме. Ужин собрал больше половины дневных жиров — если сдвинуть часть на обед, вечер пойдёт легче.',
    meals: [
      { type: 'Завтрак', time: '08:20', kcal: 471, items: [
        { name: 'Овсянка на воде · 220 г', kcal: '174 ккал', parsed: false },
        { name: 'Йогурт Teos шоколадный · 330 г', kcal: '297 ккал', parsed: false } ] },
      { type: 'Обед', time: '13:40', kcal: 410, items: [
        { name: 'Гречка готовая · 150 г', kcal: '165 ккал', parsed: false },
        { name: 'Стейк индейки · 180 г', kcal: '245 ккал', parsed: true } ] },
      { type: 'Ужин', time: '19:05', kcal: 647, items: [
        { name: 'Рис с курицей · 340 г', kcal: '521 ккал', parsed: false },
        { name: 'Салат из огурцов · 160 г', kcal: '126 ккал', parsed: false } ] },
    ],
  },
  {
    weekday: 'ВС', date: '6 сентября', label: 'Воскресенье · 6 сентября',
    eaten: 1960, spent: 2480, protein: 149, fat: 61, carbs: 182,
    steps: 12740, active: 590, exercise: 74, score: 86, weight: 77.8,
    summary:
      'Длинная прогулка и час в зале, при этом еда собрана ровно: белка почти в норме, жиры и углеводы ниже плана. Лучший день недели.',
    meals: [
      { type: 'Завтрак', time: '09:15', kcal: 452, items: [
        { name: 'Овсянка на воде · 240 г', kcal: '190 ккал', parsed: false },
        { name: 'Йогурт Teos шоколадный · 290 г', kcal: '262 ккал', parsed: false } ] },
      { type: 'Обед', time: '14:00', kcal: 698, items: [
        { name: 'Гречка готовая · 200 г', kcal: '220 ккал', parsed: false },
        { name: 'Куриная грудка · 260 г', kcal: '429 ккал', parsed: false },
        { name: 'Банан · 0,5 шт', kcal: '49 ккал', parsed: true } ] },
      { type: 'Ужин', time: '19:30', kcal: 810, items: [
        { name: 'Рис отварной · 300 г', kcal: '348 ккал', parsed: false },
        { name: 'Стейк индейки · 240 г', kcal: '326 ккал', parsed: false },
        { name: 'Салат из огурцов · 170 г', kcal: '136 ккал', parsed: false } ] },
    ],
  },
];

/** Индекс «сегодня» — последний записанный день. */
export const TODAY_INDEX = DAYS.length - 1;

export function getDay(index: number): Day {
  return DAYS[Math.min(Math.max(index, 0), DAYS.length - 1)] as Day;
}

/**
 * Сентябрь 2026: 1-е — вторник, поэтому сетка календаря начинается
 * с одной пустой клетки. Записаны шесть дней, дальше месяц не наступил.
 */
export const MONTH_OFFSET = 1;
export const MONTH_SCORES: (number | null)[] = [
  80, 73, 61, 84, 78, 86,
  ...Array.from({ length: 24 }, () => null),
];

export interface CatalogEntry {
  /** Значения на 100 г: ккал, белки, жиры, углеводы. */
  per100: [number, number, number, number];
  name: string;
  /** Ключи для разбора фразы. */
  keys: string[];
  /** Масса одной штуки, если продукт считается штуками. */
  unit?: number;
}

export const PHRASE_CATALOG: CatalogEntry[] = [
  { keys: ['гречка', 'гречк'], name: 'Гречка готовая', per100: [110, 4, 1, 22] },
  { keys: ['куриная грудка', 'курин'], name: 'Куриная грудка', per100: [165, 31, 3.6, 0] },
  { keys: ['индейк'], name: 'Стейк индейки', per100: [136, 24, 4, 0] },
  { keys: ['teos', 'теос', 'йогурт'], name: 'Йогурт Teos шоколадный', per100: [90, 30, 1, 10] },
  { keys: ['яйц', 'яиц'], name: 'Яйцо куриное', per100: [155, 13, 11, 1.1], unit: 50 },
  { keys: ['овсянк'], name: 'Овсянка на воде', per100: [79, 3, 2, 13] },
  { keys: ['творог'], name: 'Творог 5 %', per100: [121, 16, 5, 3] },
  { keys: ['хлеб'], name: 'Хлеб бородинский', per100: [208, 7, 1, 40] },
  { keys: ['рис'], name: 'Рис отварной', per100: [116, 2.2, 0.5, 25] },
  { keys: ['банан'], name: 'Банан', per100: [89, 1.1, 0.3, 23], unit: 120 },
  { keys: ['кофе с молоком', 'кофе'], name: 'Кофе с молоком', per100: [37, 1.9, 2, 3], unit: 200 },
  { keys: ['салат из огурцов', 'огурц'], name: 'Салат из огурцов', per100: [79, 1.1, 6, 3] },
];

export interface FoodEntry {
  name: string;
  per100: [number, number, number, number];
  /** Мой каталог правится, общая база копируется в него. */
  mine: boolean;
  used: string;
  rank: number;
  portion: number;
}

export const FOOD_DB: FoodEntry[] = [
  { name: 'Гречка готовая', per100: [110, 4, 1, 22], mine: true, used: '34 раза', rank: 34, portion: 150 },
  { name: 'Йогурт Teos шоколадный', per100: [90, 30, 1, 10], mine: true, used: '21 раз', rank: 21, portion: 330 },
  { name: 'Стейк индейки', per100: [136, 24, 4, 0], mine: true, used: '18 раз', rank: 18, portion: 180 },
  { name: 'Овсянка на воде', per100: [79, 3, 2, 13], mine: true, used: '15 раз', rank: 15, portion: 220 },
  { name: 'Сырники домашние', per100: [244, 14, 11, 22], mine: true, used: '6 раз', rank: 6, portion: 180 },
  { name: 'Салат из огурцов', per100: [79, 1.1, 6, 3], mine: true, used: '5 раз', rank: 5, portion: 160 },
  { name: 'Куриная грудка отварная', per100: [165, 31, 3.6, 0], mine: false, used: '', rank: 0, portion: 200 },
  { name: 'Творог 5 % Простоквашино', per100: [121, 16, 5, 3], mine: false, used: '', rank: 0, portion: 180 },
  { name: 'Хлеб бородинский', per100: [208, 7, 1, 40], mine: false, used: '', rank: 0, portion: 60 },
  { name: 'Рис отварной', per100: [116, 2.2, 0.5, 25], mine: false, used: '', rank: 0, portion: 250 },
  { name: 'Банан', per100: [89, 1.1, 0.3, 23], mine: false, used: '', rank: 0, portion: 120 },
  { name: 'Яйцо куриное', per100: [155, 13, 11, 1.1], mine: false, used: '', rank: 0, portion: 100 },
  { name: 'Сыр Гауда 45 %', per100: [356, 25, 27, 2], mine: false, used: '', rank: 0, portion: 40 },
  { name: 'Молоко 2,5 %', per100: [52, 2.9, 2.5, 4.7], mine: false, used: '', rank: 0, portion: 200 },
];

export const SESSIONS = [
  { device: 'Chrome · Windows', meta: 'Москва · сейчас', current: true },
  { device: 'iPhone 15 · приложение', meta: 'Москва · 5 сентября, 19:12', current: false },
  { device: 'Safari · macOS', meta: 'Санкт-Петербург · 28 августа', current: false },
];
