import { FOOD_DB, PHRASE_CATALOG, type FoodEntry } from './mock/diary';

export interface ParsedItem {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** Продукт не нашёлся ни в каталоге, ни в базе. */
  unknown?: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Разбор фразы вида «гречка 150 г, стейк индейки 180 г, кофе».
 * Порт разбора из макета: продукт ищется по ключам, масса — по числу,
 * «шт» умножает на массу одной штуки. Неузнанное не выбрасывается,
 * а показывается пользователю отдельной строкой.
 */
export function parsePhrase(text: string): ParsedItem[] {
  return text
    .split(/[,;\n]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const low = chunk.toLowerCase().replace(/ё/g, 'е');
      const hit = PHRASE_CATALOG.find((c) => c.keys.some((k) => low.includes(k)));
      if (!hit) {
        return { name: chunk, grams: 0, kcal: 0, protein: 0, fat: 0, carbs: 0, unknown: true };
      }
      const num = /(\d+[.,]?\d*)/.exec(low);
      const pieces = /шт/.test(low);
      let grams = num?.[1] ? parseFloat(num[1].replace(',', '.')) : (hit.unit ?? 150);
      if (num && hit.unit && (pieces || grams <= 5)) grams *= hit.unit;
      const at = (i: 0 | 1 | 2 | 3) => (hit.per100[i] * grams) / 100;
      return {
        name: hit.name,
        grams: Math.round(grams),
        kcal: Math.round(at(0)),
        protein: round1(at(1)),
        fat: round1(at(2)),
        carbs: round1(at(3)),
      };
    });
}

export interface Suggestion {
  entry: FoodEntry;
  index: number;
}

/**
 * Подсказки под полем: последний фрагмент строки → продукты, которыми человек
 * уже владеет. Пусто или коротко — самые частые из моего каталога.
 */
export function suggestFor(text: string): { frequent: boolean; list: Suggestion[] } {
  const tail = (text.split(/[,;\n]/).pop() ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\d+[.,]?\d*/g, ' ')
    .replace(/(^|\s)(граммов|грамма|грамм|гр|шт|мл|г)\.?(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const pool: Suggestion[] = FOOD_DB.map((entry, index) => ({ entry, index }));
  const frequent = pool
    .filter((x) => x.entry.rank > 0)
    .sort((a, b) => b.entry.rank - a.entry.rank)
    .slice(0, 4);

  if (tail.length < 2) return { frequent: true, list: frequent };

  const hits = pool
    .filter((x) => x.entry.name.toLowerCase().replace(/ё/g, 'е').includes(tail))
    .sort((a, b) => b.entry.rank - a.entry.rank)
    .slice(0, 5);

  return hits.length ? { frequent: false, list: hits } : { frequent: true, list: frequent };
}

export interface Norms {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** Норма по Миффлину — Сан-Жеору с коэффициентом активности 1,55. */
export function calcNorms(input: {
  sex: 'f' | 'm';
  age: number;
  height: number;
  weight: number;
  goal: 'cut' | 'maintain' | 'bulk';
}): Norms {
  const { sex, age, height, weight, goal } = input;
  const bmr =
    10 * weight + 6.25 * height - 5 * age + (sex === 'm' ? 5 : -161);
  const tdee = bmr * 1.55;
  const adjust = goal === 'cut' ? -0.18 : goal === 'bulk' ? 0.12 : 0;
  const kcal = Math.round(tdee * (1 + adjust));
  const perKg = goal === 'cut' ? 2.0 : goal === 'bulk' ? 1.8 : 1.6;
  const protein = Math.round(weight * perKg);
  const fat = Math.round((kcal * 0.28) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs };
}

/** Тысячи разделяются обычным пробелом: узкий неразрывный ломает tnum-колонки. */
export const fmt = (n: number) =>
  Math.round(n).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');

/** Десятичная запятая: точка в «Ж 1.5» выбивается из русского интерфейса. */
export const dec = (n: number) => String(n).replace('.', ',');

export function ageFrom(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number);
  let age = now.getFullYear() - (y ?? 1996);
  const month = (m ?? 4) - 1;
  const day = d ?? 12;
  if (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day)) age -= 1;
  return age;
}

export const MONTH_NAMES = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

export const MONTH_OF = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

export function pluralYears(age: number): string {
  const mod10 = age % 10;
  const mod100 = age % 100;
  if (mod10 === 1 && mod100 !== 11) return age + ' год';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return age + ' года';
  return age + ' лет';
}
