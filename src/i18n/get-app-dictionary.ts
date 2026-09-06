import type { Locale } from './config';
import { appRu, type AppDictionary } from './dictionaries/app.ru';
import { appEn } from './dictionaries/app.en';

const dictionaries: Record<Locale, AppDictionary> = { ru: appRu, en: appEn };

export function getAppDictionary(locale: Locale): AppDictionary {
  return dictionaries[locale];
}
