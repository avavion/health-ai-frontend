'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Locale } from '@/i18n/config';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import type { Dictionary } from '@/i18n/dictionaries/ru';
import type { DeviceSession, Nutrients, Profile } from '@/lib/api/types';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ageFrom, dec, fmt, pluralYears } from '@/lib/nutrition';
import styles from './screens.module.css';
import set from './settings.module.css';
import { route } from '@/lib/route';

type Stage = 'idle' | 'confirm' | 'done';

export function SettingsScreen({
  locale,
  t,
  site,
  profile,
  goals,
  sessions,
}: {
  locale: Locale;
  t: AppDictionary;
  site: Dictionary;
  profile: Profile;
  goals: Nutrients;
  sessions: DeviceSession[];
}) {
  const router = useRouter();
  const { setting, labels } = useTheme();

  const [stage, setStage] = useState<Stage>('idle');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const r = t.settings.rows;

  const sections = [
    {
      title: t.settings.profile,
      rows: [
        [r.age[0], pluralYears(ageFrom(profile.birth_date)), r.age[2]] as const,
        [r.height[0], dec(profile.height_cm) + ' см', r.height[2]] as const,
        [r.weight[0], dec(profile.weight_kg) + ' кг', r.weight[2]] as const,
        [r.goal[0], t.settings.goals[profile.goal_type], r.goal[2]] as const,
        [r.activity[0], t.settings.activity[profile.activity_level], r.activity[2]] as const,
      ],
    },
    {
      title: t.settings.app,
      rows: [
        [r.theme[0], labels[setting], r.theme[2]] as const,
        r.units,
        r.parsing,
        r.health,
      ],
    },
  ];

  const norms = [
    { label: t.summary.kcalRow, value: fmt(goals.kcal) + ' ' + t.today.kcal },
    { label: t.today.protein, value: Math.round(goals.protein) + ' г' },
    { label: t.today.fat, value: Math.round(goals.fat) + ' г' },
    { label: t.today.carbs, value: Math.round(goals.carbs) + ' г' },
  ];

  async function revoke(id?: string) {
    setPending(true);
    try {
      await fetch('/api/auth/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : {}),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function deleteAccount() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setError(body.message ?? t.settings.deleteFailed);
        return;
      }

      setStage('done');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.columns}>
      <div className={styles.wide} style={{ flexBasis: 420 }}>
        {sections.map((section) => (
          <section className={set.section} key={section.title}>
            <p className={'kicker tnum ' + set.sectionLabel}>{section.title}</p>
            {section.rows.map((row) => (
              <div className={set.row} key={row[0]}>
                <div className={set.rowMain}>
                  <div className={set.rowLabel}>{row[0]}</div>
                  <div className={set.rowHint}>{row[2]}</div>
                </div>
                <span className={'tnum ' + set.rowValue}>{row[1]}</span>
              </div>
            ))}
          </section>
        ))}

        <section className={set.section}>
          <div className={set.sectionHead}>
            <p className={'kicker tnum ' + set.sectionLabel}>{t.settings.sessions}</p>
            {sessions.length > 1 ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={() => revoke()}
              >
                {t.settings.revokeOthers}
              </button>
            ) : null}
          </div>

          {sessions.map((session) => (
            <div className={set.row} key={session.id}>
              <div className={set.rowMain}>
                <div className={set.rowLabel}>{session.device_name ?? t.settings.unknownDevice}</div>
                <div className={'tnum ' + set.rowHint}>{sessionMeta(session, locale, t)}</div>
              </div>
              {session.is_current ? (
                <span className={set.current}>{t.settings.thisDevice}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pending}
                  onClick={() => revoke(session.id)}
                >
                  {t.settings.revoke}
                </button>
              )}
            </div>
          ))}
        </section>
      </div>

      <div className={styles.side}>
        <div className={styles.panel}>
          <p className={'kicker tnum ' + styles.panelKicker} style={{ marginBottom: 10 }}>
            {t.settings.norms}
          </p>
          <dl className={styles.rows}>
            {norms.map((row) => (
              <div className={'tnum ' + styles.row} key={row.label}>
                <dt>{row.label}</dt>
                <dd className={styles.rowValue}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.panelNote} style={{ marginBottom: 14 }}>
            {profile.computed.observed_tdee
              ? t.settings.observedTdee + ' ' + fmt(profile.computed.observed_tdee) + ' ' + t.today.kcal
              : t.settings.normsNote}
          </p>
        </div>

        <div className={styles.panel}>
          <p className={'kicker tnum ' + styles.panelKicker} style={{ marginBottom: 10 }}>
            {t.settings.data}
          </p>
          <p className={set.paragraph}>{t.settings.dataNote}</p>
          <Link className="btn btn-secondary btn-block" href={'/api/export'} prefetch={false}>
            {t.settings.exportData}
          </Link>
          <hr className="hr" />

          {stage === 'idle' ? (
            <div>
              <p className={set.paragraph}>{t.settings.deleteNote}</p>
              <button
                type="button"
                className={'btn btn-ghost btn-block ' + set.danger}
                onClick={() => setStage('confirm')}
              >
                {t.settings.deleteAccount}
              </button>
            </div>
          ) : null}

          {stage === 'confirm' ? (
            <div>
              <p className={set.paragraph}>{t.settings.deleteWhat}</p>
              <div className="field" style={{ marginBottom: 18 }}>
                <label htmlFor="ha-del">{t.settings.password}</label>
                <input
                  className="input"
                  id="ha-del"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                />
                <span className={set.rowHint}>{t.settings.passwordHint}</span>
              </div>

              {error ? (
                <p className={set.paragraph} role="alert">
                  {error}
                </p>
              ) : null}

              <div className={set.actions}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={password.length < 8 || pending}
                  onClick={deleteAccount}
                >
                  {t.settings.deleteForever}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setStage('idle');
                    setPassword('');
                    setError('');
                  }}
                >
                  {t.settings.cancel}
                </button>
              </div>
            </div>
          ) : null}

          {stage === 'done' ? <div className={set.done}>{t.settings.deleteDone}</div> : null}
        </div>

        <div className={styles.panel}>
          <p className={'kicker tnum ' + styles.panelKicker} style={{ marginBottom: 10 }}>
            {t.settings.documents}
          </p>
          <div className={set.links}>
            <Link href={route('/' + locale + '/legal/privacy')}>{site.legal.privacy}</Link>
            <Link href={route('/' + locale + '/legal/data-collected')}>
              {site.legal['data-collected']}
            </Link>
            <Link href={route('/' + locale + '/legal/terms')}>{site.legal.terms}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Строка под именем устройства: место и когда его видели в последний раз (§4.4). */
function sessionMeta(session: DeviceSession, locale: Locale, t: AppDictionary): string {
  const place = [session.city, session.country].filter(Boolean).join(', ');
  const seen = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(session.last_seen_at));

  const parts = [place, seen].filter(Boolean);
  if (session.is_suspicious) parts.push(t.settings.suspicious);
  return parts.join(' · ');
}
