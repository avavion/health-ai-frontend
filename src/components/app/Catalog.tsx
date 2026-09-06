'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import type { BaseItem, PersonalItem } from '@/lib/api/types';
import { dec } from '@/lib/nutrition';
import styles from './screens.module.css';
import table from './catalog.module.css';

interface Draft {
  /** Ключ личной записи. Для продукта общей базы — будущий, копия ещё не создана. */
  key: string;
  name: string;
  baseId: string | null;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  portion: number | null;
  /** Правка своей записи или копирование общей: от этого зависит текст кнопки. */
  fromBase: boolean;
}

/** Расхождение ккал с суммой БЖУ, за которым стоит искать опечатку. */
const CHECKSUM_TOLERANCE = 25;

/**
 * Продукты: свой каталог и общая база.
 *
 * Свои записи приходят с сервера целиком — их сотни, не тысячи. Общая база
 * ищется запросом: держать в браузере три тысячи позиций ради строки поиска
 * незачем, а искать по ним на сервере — один запрос в двести миллисекунд.
 */
export function Catalog({ t, personal }: { t: AppDictionary; personal: PersonalItem[] }) {
  const router = useRouter();

  const [tab, setTab] = useState<'mine' | 'common'>('mine');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<BaseItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Поиск по общей базе с паузой: запрос на каждую букву — это запрос на
  // каждую букву, а человек набирает «гречка» шестью нажатиями.
  useEffect(() => {
    if (tab !== 'common') return;
    const text = query.trim();
    if (text.length < 2) {
      setFound([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch('/api/catalog/search?q=' + encodeURIComponent(text));
        const body = (await response.json()) as { items?: BaseItem[] };
        setFound(body.items ?? []);
      } catch {
        setFound([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, tab]);

  const normalized = query.trim().toLowerCase().replace(/ё/g, 'е');
  const mine = personal.filter(
    (item) => !normalized || item.display_name.toLowerCase().replace(/ё/g, 'е').includes(normalized),
  );

  const checksum = draft ? Math.round(draft.protein * 4 + draft.fat * 9 + draft.carbs * 4) : 0;
  const drift = draft ? Math.abs(checksum - draft.kcal) : 0;

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/catalog/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: draft.key,
          display_name: draft.name,
          base_id: draft.baseId,
          per_100g: {
            kcal: draft.kcal,
            protein: draft.protein,
            fat: draft.fat,
            carbs: draft.carbs,
          },
          default_serving_grams: draft.portion,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setError(body.message ?? t.catalog.saveFailed);
        return;
      }

      setDraft(null);
      setTab('mine');
      // Список свой каталог приходит с сервера — после записи страницу надо
      // пересобрать, иначе новая строка появится только после перезагрузки.
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.columns}>
      <div className={styles.wide} style={{ flexBasis: 480 }}>
        <div className={table.controls}>
          <div className={styles.chips}>
            <button
              type="button"
              className={styles.chip}
              aria-pressed={tab === 'mine'}
              onClick={() => {
                setTab('mine');
                setDraft(null);
              }}
            >
              {t.catalog.mine}
            </button>
            <button
              type="button"
              className={styles.chip}
              aria-pressed={tab === 'common'}
              onClick={() => {
                setTab('common');
                setDraft(null);
              }}
            >
              {t.catalog.common}
            </button>
          </div>
          <input
            className={'input ' + table.search}
            placeholder={t.catalog.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.tableWrap}>
          <table className="table">
            <thead>
              <tr>
                <th>{t.catalog.product}</th>
                <th className={styles.right}>{t.catalog.kcal}</th>
                <th className={styles.right}>Б</th>
                <th className={styles.right}>Ж</th>
                <th className={styles.right}>У</th>
                <th className={styles.right}>{t.catalog.portion}</th>
              </tr>
            </thead>
            <tbody>
              {tab === 'mine'
                ? mine.map((item) => (
                    <tr
                      key={item.key}
                      className={table.row}
                      aria-selected={draft?.key === item.key}
                      onClick={() => setDraft(draftOfPersonal(item))}
                    >
                      <td>
                        {item.display_name}
                        <div className={table.meta}>
                          {item.usage_count > 0
                            ? t.catalog.used + ' ' + item.usage_count
                            : t.catalog.myProduct}
                        </div>
                      </td>
                      <td className={'tnum ' + styles.right}>{dec(item.per_100g.kcal)}</td>
                      <td className={'tnum ' + styles.right}>{dec(item.per_100g.protein)}</td>
                      <td className={'tnum ' + styles.right}>{dec(item.per_100g.fat)}</td>
                      <td className={'tnum ' + styles.right}>{dec(item.per_100g.carbs)}</td>
                      <td className={'tnum ' + styles.right}>
                        {item.default_serving_grams ? item.default_serving_grams + ' г' : '—'}
                      </td>
                    </tr>
                  ))
                : found.map((item) => (
                    <tr
                      key={item.id}
                      className={table.row}
                      aria-selected={draft?.baseId === item.id}
                      onClick={() => setDraft(draftOfBase(item))}
                    >
                      <td>
                        {item.display_name}
                        <div className={table.meta}>{t.catalog.fromCommon}</div>
                      </td>
                      <td className={'tnum ' + styles.right}>{dec(item.per_100g.kcal)}</td>
                      <td className={'tnum ' + styles.right}>{dec(item.per_100g.protein)}</td>
                      <td className={'tnum ' + styles.right}>{dec(item.per_100g.fat)}</td>
                      <td className={'tnum ' + styles.right}>{dec(item.per_100g.carbs)}</td>
                      <td className={'tnum ' + styles.right}>
                        {item.default_serving_grams ? item.default_serving_grams + ' г' : '—'}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {tab === 'mine' && mine.length === 0 ? (
          <p className={styles.panelNote}>{t.catalog.mineEmpty}</p>
        ) : null}
        {tab === 'common' && found.length === 0 ? (
          <p className={styles.panelNote}>
            {searching ? t.catalog.searching : t.catalog.searchHint}
          </p>
        ) : null}

        <p className={styles.panelNote}>{t.catalog.note}</p>
      </div>

      <div className={styles.side}>
        <div className={styles.panel}>
          <p className={'kicker tnum ' + styles.panelKicker} style={{ marginBottom: 12 }}>
            {t.catalog.edit}
          </p>

          {!draft ? (
            <p className={table.editEmpty}>{t.catalog.editEmpty}</p>
          ) : (
            <div>
              <div className="field">
                <label htmlFor="ha-ed-name">{t.catalog.name}</label>
                <input
                  className="input"
                  id="ha-ed-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className={table.macroFields}>
                {(
                  [
                    ['kcal', t.catalog.kcal],
                    ['protein', 'Б'],
                    ['fat', 'Ж'],
                    ['carbs', 'У'],
                  ] as const
                ).map(([key, label]) => (
                  <div className="field" key={key}>
                    <label htmlFor={'ha-ed-' + key}>{label}</label>
                    <input
                      className="input tnum"
                      id={'ha-ed-' + key}
                      type="number"
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>
              <div className={'tnum ' + table.checksum}>
                <span>{t.catalog.checksum}</span>
                <span className={drift > CHECKSUM_TOLERANCE ? styles.over : undefined}>
                  {checksum} {t.today.kcal}
                </span>
              </div>
              <p className={styles.panelNote} style={{ marginBottom: 16 }}>
                {drift > CHECKSUM_TOLERANCE
                  ? drift + ' ' + t.catalog.checksumDrift
                  : t.catalog.checksumOk}
              </p>

              {error ? (
                <p className={styles.panelNote} role="alert" style={{ marginBottom: 12 }}>
                  {error}
                </p>
              ) : null}

              <div className={table.editActions}>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
                  {draft.fromBase ? t.catalog.copyToMine : t.catalog.save}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setDraft(null)}>
                  {t.catalog.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function draftOfPersonal(item: PersonalItem): Draft {
  return {
    key: item.key,
    name: item.display_name,
    baseId: item.base_id,
    kcal: item.per_100g.kcal,
    protein: item.per_100g.protein,
    fat: item.per_100g.fat,
    carbs: item.per_100g.carbs,
    portion: item.default_serving_grams,
    fromBase: false,
  };
}

/**
 * Продукт общей базы правится не на месте, а копией в свой каталог: общая
 * база одна на всех, и «поправил себе гречку» не должно менять её остальным
 * (§8.2). Связь с исходником остаётся в base_id.
 */
function draftOfBase(item: BaseItem): Draft {
  return {
    key: normalizeKey(item.display_name),
    name: item.display_name,
    baseId: item.id,
    kcal: item.per_100g.kcal,
    protein: item.per_100g.protein,
    fat: item.per_100g.fat,
    carbs: item.per_100g.carbs,
    portion: item.default_serving_grams,
    fromBase: true,
  };
}

/** Ключ личной записи: нормализованное имя, как его строит приложение (§8.2). */
export function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}
