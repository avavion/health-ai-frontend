'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/i18n/config';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import type { BaseItem, MealType, Nutrients, PersonalItem, Per100g } from '@/lib/api/types';
import { dec, fmt } from '@/lib/nutrition';
import styles from './screens.module.css';
import entry from './entry.module.css';

type Phase = 'idle' | 'resolving' | 'ready' | 'saving' | 'saved';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface DraftItem {
  id: string;
  name: string;
  grams: number;
  per100: Per100g;
  /** Откуда пришла позиция: из каталога, из разбора модели или руками (§7.1). */
  source: 'catalog' | 'catalog_via_ai' | 'ai_estimate' | 'manual';
  catalogKey: string | null;
  /** Модель не смогла разобрать фрагмент: позиция показывается, но не сохраняется. */
  unresolved?: boolean;
}

/**
 * Запись еды.
 *
 * Разбор фразы делает бэкенд (§6.5): промпт, схема ответа и починка ответа
 * модели живут там же, где ключи вендоров. Сайт шлёт фрагменты и получает
 * позиции с граммовкой — ровно то же, что делает приложение.
 *
 * Сохранение — PUT с идентификатором, сгенерированным здесь (§7.1): дневник
 * офлайн-первый, и повторная отправка того же приёма пищи обязана быть
 * безопасной.
 */
export function Entry({
  locale,
  t,
  date,
  isToday,
  personal,
  remaining,
}: {
  locale: Locale;
  t: AppDictionary;
  date: string;
  isToday: boolean;
  personal: PersonalItem[];
  /** Остаток калорий на день до этой записи — им заканчивается подтверждение. */
  remaining: number;
}) {
  const router = useRouter();

  const [tab, setTab] = useState<'phrase' | 'manual'>('phrase');
  const [text, setText] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [phase, setPhase] = useState<Phase>('idle');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [found, setFound] = useState<BaseItem[]>([]);

  /** Ключ идемпотентности на один разбор: повтор кнопкой не должен списывать квоту дважды. */
  const [resolveId, setResolveId] = useState(() => crypto.randomUUID());

  const suggestions = useMemo(() => suggestFor(text, personal), [text, personal]);

  useEffect(() => {
    if (tab !== 'manual') return;
    const value = query.trim();
    if (value.length < 2) {
      setFound([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/catalog/search?q=' + encodeURIComponent(value));
        const body = (await response.json()) as { items?: BaseItem[] };
        setFound(body.items ?? []);
      } catch {
        setFound([]);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, tab]);

  async function resolve() {
    const fragments = text
      .split(/[,;\n]+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    if (fragments.length === 0) return;

    setPhase('resolving');
    setError('');

    try {
      const response = await fetch('/api/food/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fragments, requestId: resolveId, locale }),
      });

      const body = (await response.json()) as {
        items?: { name: string; catalog_key: string | null; grams: number; per_100g: Per100g }[];
        unresolved_fragments?: string[];
        warnings?: string[];
        message?: string;
      };

      if (!response.ok) {
        setError(body.message ?? t.entry.resolveFailed);
        setPhase('idle');
        return;
      }

      const resolved: DraftItem[] = (body.items ?? []).map((item) => ({
        id: crypto.randomUUID(),
        name: item.name,
        grams: item.grams,
        per100: item.per_100g,
        // Каталожная позиция, найденная моделью, — это catalog_via_ai (§7.1):
        // цифры взяты из каталога, а нашла их модель.
        source: item.catalog_key ? 'catalog_via_ai' : 'ai_estimate',
        catalogKey: item.catalog_key,
      }));

      const unresolved: DraftItem[] = (body.unresolved_fragments ?? []).map((fragment) => ({
        id: crypto.randomUUID(),
        name: fragment,
        grams: 0,
        per100: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
        source: 'manual',
        catalogKey: null,
        unresolved: true,
      }));

      setItems((previous) => previous.concat(resolved, unresolved));
      setWarnings(body.warnings ?? []);
      setPhase('ready');
    } catch {
      setError(t.entry.resolveFailed);
      setPhase('idle');
    }
  }

  function addPersonal(item: PersonalItem) {
    const grams = item.default_serving_grams ?? 100;
    setItems((previous) =>
      previous.concat({
        id: crypto.randomUUID(),
        name: item.display_name,
        grams,
        per100: item.per_100g,
        source: 'catalog',
        catalogKey: 'own:' + item.key,
      }),
    );
    setPhase('ready');
  }

  function addBase(item: BaseItem) {
    const grams = item.default_serving_grams ?? 100;
    setItems((previous) =>
      previous.concat({
        id: crypto.randomUUID(),
        name: item.display_name,
        grams,
        per100: item.per_100g,
        source: 'catalog',
        catalogKey: 'base:' + item.id,
      }),
    );
    setPhase('ready');
  }

  const kept = items.filter((item) => !item.unresolved);
  const totals = kept.reduce<Nutrients>(
    (acc, item) => {
      const value = absolute(item);
      return {
        kcal: acc.kcal + value.kcal,
        protein: acc.protein + value.protein,
        fat: acc.fat + value.fat,
        carbs: acc.carbs + value.carbs,
      };
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );

  async function save() {
    if (kept.length === 0) return;
    setPhase('saving');
    setError('');

    try {
      const response = await fetch('/api/diary/meals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          eaten_at: eatenAt(date, isToday),
          meal_type: mealType,
          raw_text: text.trim(),
          items: kept.map((item, index) => ({
            id: item.id,
            name: item.name,
            grams: item.grams,
            nutrients: absolute(item),
            source: item.source,
            catalog_key: item.catalogKey,
            sort_index: index,
          })),
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setError(body.message ?? t.entry.saveFailed);
        setPhase('ready');
        return;
      }

      setPhase('saved');
      // Дневник собирается на сервере: без пересборки «Сегодня» покажет день
      // без только что записанного приёма пищи.
      router.refresh();
    } catch {
      setError(t.entry.saveFailed);
      setPhase('ready');
    }
  }

  function reset() {
    setItems([]);
    setText('');
    setWarnings([]);
    setPhase('idle');
    setResolveId(crypto.randomUUID());
  }

  return (
    <div className={styles.columns}>
      <div className={styles.wide}>
        <div className={styles.chips} style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={tab === 'phrase'}
            onClick={() => setTab('phrase')}
          >
            {t.entry.byPhrase}
          </button>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={tab === 'manual'}
            onClick={() => setTab('manual')}
          >
            {t.entry.fromCatalog}
          </button>
        </div>

        {tab === 'phrase' ? (
          <div>
            <div className={styles.chips} style={{ marginBottom: 14 }}>
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={styles.chip}
                  aria-pressed={mealType === type}
                  onClick={() => setMealType(type)}
                >
                  {t.mealTypes[type]}
                </button>
              ))}
            </div>

            <div className="field">
              <label htmlFor="ha-meal">{t.entry.label}</label>
              <textarea
                className="input"
                id="ha-meal"
                rows={3}
                placeholder={t.entry.placeholder}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void resolve();
                  }
                }}
              />
            </div>

            <div className={entry.actions}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={phase === 'resolving'}
                onClick={resolve}
              >
                {phase === 'resolving' ? t.entry.resolving : t.entry.resolve}
              </button>
              <span className={entry.hotkey}>{t.entry.hotkey}</span>
            </div>

            {suggestions.list.length > 0 ? (
              <div style={{ marginTop: 18 }}>
                <p className={'kicker tnum ' + entry.suggestLabel}>
                  {suggestions.frequent ? t.entry.frequent : t.entry.matches}
                </p>
                <div className={styles.chips}>
                  {suggestions.list.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={entry.suggestion + ' ' + entry.mine}
                      onClick={() => addPersonal(item)}
                    >
                      {item.display_name}
                      {item.default_serving_grams ? ' · ' + item.default_serving_grams + ' г' : ''}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div>
            <div className="field">
              <label htmlFor="ha-manual">{t.entry.search}</label>
              <input
                className="input"
                id="ha-manual"
                placeholder={t.entry.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className={entry.hitList}>
              {matchingPersonal(query, personal).map((item) => (
                <div className={entry.hit} key={'own-' + item.key}>
                  <div className={entry.hitName}>
                    <div>{item.display_name}</div>
                    <div className={'tnum ' + entry.hitMeta}>
                      {t.entry.mine}
                      {item.usage_count > 0 ? ' · ' + t.catalog.used + ' ' + item.usage_count : ''}
                    </div>
                  </div>
                  <span className={'tnum ' + entry.hitKcal}>
                    {Math.round(
                      (item.per_100g.kcal * (item.default_serving_grams ?? 100)) / 100,
                    )}{' '}
                    {t.today.kcal}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => addPersonal(item)}>
                    {t.entry.add}
                  </button>
                </div>
              ))}

              {found.map((item) => (
                <div className={entry.hit} key={'base-' + item.id}>
                  <div className={entry.hitName}>
                    <div>{item.display_name}</div>
                    <div className={'tnum ' + entry.hitMeta}>{t.entry.common}</div>
                  </div>
                  <span className={'tnum ' + entry.hitKcal}>
                    {Math.round(
                      (item.per_100g.kcal * (item.default_serving_grams ?? 100)) / 100,
                    )}{' '}
                    {t.today.kcal}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => addBase(item)}>
                    {t.entry.add}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.side}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={'kicker tnum ' + styles.panelKicker}>{t.entry.result}</p>
            <span className={styles.mealTime}>
              {items.some((item) => item.source !== 'catalog') ? t.entry.byAi : t.entry.fromCatalog}
            </span>
          </div>

          {phase === 'idle' && items.length === 0 ? (
            <p className={entry.placeholder}>{t.entry.empty}</p>
          ) : null}

          {phase === 'resolving' ? (
            <div>
              <div className={entry.skeleton} />
              <div className={entry.skeleton} style={{ width: '72%' }} />
              <div className={entry.skeleton} style={{ width: '54%' }} />
            </div>
          ) : null}

          {phase === 'saved' ? (
            <div className={entry.saved}>
              {t.entry.saved} {t.mealTypes[mealType]}. {t.entry.savedTail}{' '}
              {fmt(Math.max(0, remaining - totals.kcal))} {t.today.kcal}.
              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ marginTop: 14 }}
                onClick={reset}
              >
                {t.entry.writeMore}
              </button>
            </div>
          ) : null}

          {error ? (
            <p className={styles.panelNote} role="alert">
              {error}
            </p>
          ) : null}

          {phase !== 'saved' && items.length > 0 ? (
            <div>
              <div className={entry.items}>
                {items.map((item) => {
                  const value = absolute(item);
                  return (
                    <div className={entry.item} key={item.id}>
                      <div className={entry.itemHead}>
                        <span className={item.unresolved ? entry.unknown : undefined}>
                          {item.unresolved ? item.name + ' — ' + t.entry.unknown : item.name}
                        </span>
                        <span className="tnum">
                          {fmt(value.kcal)} {t.today.kcal}
                        </span>
                      </div>
                      <div className={'tnum ' + entry.itemMacros}>
                        <span>
                          {item.unresolved ? (
                            '—'
                          ) : (
                            <input
                              className={'input tnum ' + entry.gramsInput}
                              type="number"
                              min={0}
                              value={item.grams}
                              aria-label={t.entry.grams}
                              onChange={(e) =>
                                setItems((previous) =>
                                  previous.map((candidate) =>
                                    candidate.id === item.id
                                      ? { ...candidate, grams: Number(e.target.value) }
                                      : candidate,
                                  ),
                                )
                              }
                            />
                          )}
                        </span>
                        <span>Б {dec(round1(value.protein))}</span>
                        <span>Ж {dec(round1(value.fat))}</span>
                        <span>У {dec(round1(value.carbs))}</span>
                        <button
                          type="button"
                          className={entry.remove}
                          aria-label={t.entry.remove}
                          onClick={() =>
                            setItems((previous) =>
                              previous.filter((candidate) => candidate.id !== item.id),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {warnings.map((warning) => (
                <p className={styles.panelNote} key={warning}>
                  {warning}
                </p>
              ))}

              <div className={'tnum ' + entry.total}>
                <span>{t.entry.total}</span>
                <span>
                  {fmt(totals.kcal)} {t.today.kcal}
                </span>
              </div>
              <div className={'tnum ' + entry.totalMacros}>
                Б {Math.round(totals.protein)} · Ж {Math.round(totals.fat)} · У{' '}
                {Math.round(totals.carbs)}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={phase === 'saving' || kept.length === 0}
                onClick={save}
              >
                {phase === 'saving' ? t.entry.saving : t.entry.save + ' ' + t.mealTypes[mealType]}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** КБЖУ на съеденную массу: API хранит абсолютные значения, каталог — на 100 г (§7.1). */
function absolute(item: DraftItem): Nutrients {
  const factor = item.grams / 100;
  return {
    kcal: Math.round(item.per100.kcal * factor),
    protein: round1(item.per100.protein * factor),
    fat: round1(item.per100.fat * factor),
    carbs: round1(item.per100.carbs * factor),
  };
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Момент приёма пищи.
 *
 * Для сегодняшнего дня — сейчас; для прошедшего — полдень: точного времени
 * человек уже не помнит, а полночь отнесла бы запись к соседнему дню в другом
 * часовом поясе.
 */
function eatenAt(date: string, isToday: boolean): string {
  if (isToday) return new Date().toISOString();
  return new Date(date + 'T12:00:00').toISOString();
}

function matchingPersonal(query: string, personal: PersonalItem[]): PersonalItem[] {
  const value = query.trim().toLowerCase().replace(/ё/g, 'е');
  if (!value) return personal.slice(0, 8);
  return personal
    .filter((item) => item.display_name.toLowerCase().replace(/ё/g, 'е').includes(value))
    .slice(0, 8);
}

/**
 * Подсказки под полем: последний фрагмент строки → продукты своего каталога.
 * Пусто или коротко — самые частые.
 */
function suggestFor(
  text: string,
  personal: PersonalItem[],
): { frequent: boolean; list: PersonalItem[] } {
  const byUsage = [...personal].sort((a, b) => b.usage_count - a.usage_count);
  const frequent = byUsage.slice(0, 4);

  const tail = (text.split(/[,;\n]/).pop() ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\d+[.,]?\d*/g, ' ')
    .replace(/(^|\s)(граммов|грамма|грамм|гр|шт|мл|г)\.?(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (tail.length < 2) return { frequent: true, list: frequent };

  const hits = byUsage
    .filter((item) => item.display_name.toLowerCase().replace(/ё/g, 'е').includes(tail))
    .slice(0, 5);

  return hits.length ? { frequent: false, list: hits } : { frequent: true, list: frequent };
}
