import type { Locale } from './config';
import { ru, type Dictionary } from './dictionaries/ru';
import { en } from './dictionaries/en';

const dictionaries: Record<Locale, Dictionary> = { ru, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
