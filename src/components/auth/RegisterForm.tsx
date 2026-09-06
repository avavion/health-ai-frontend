'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Locale } from '@/i18n/config';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import type { AuthPolicy } from '@/lib/api/types';
import { ageFrom, calcNorms, fmt } from '@/lib/nutrition';
import { DatePicker } from './DatePicker';
import styles from './auth.module.css';
import { route } from '@/lib/route';

type Goal = 'cut' | 'maintain' | 'bulk';

/**
 * Регистрация (§3).
 *
 * Четыре шага: знакомство, тело, аккаунт и код из письма. Последний шаг
 * появляется по политике сервера (§3.0), а не по зашитому предположению:
 * включат подтверждение почты или выключат — форма узнает об этом сама.
 *
 * Профиль дописывается уже после создания аккаунта: сначала API отдаёт
 * сессию, и только с ней можно записать рост, вес и цель (§5.2).
 */
export function RegisterForm({
  locale,
  t,
  policy,
}: {
  locale: Locale;
  t: AppDictionary;
  policy: AuthPolicy;
}) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const [name, setName] = useState('');
  const [birth, setBirth] = useState('1996-04-12');
  const [sex, setSex] = useState<'f' | 'm'>('f');
  const [height, setHeight] = useState(178);
  const [weight, setWeight] = useState(79);
  const [goal, setGoal] = useState<Goal>('cut');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);

  const [registrationToken, setRegistrationToken] = useState('');
  const [code, setCode] = useState('');

  const totalSteps = policy.email_verification === 'off' ? 3 : 4;
  const stepText = t.auth.steps[Math.min(step, 3) - 1] ?? t.auth.steps[0];
  const norms = calcNorms({ sex, age: ageFrom(birth), height, weight, goal });

  /** Профиль дописывается после входа: до него записывать некуда. */
  async function saveProfile() {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sex: sex === 'm' ? 'male' : 'female',
        birth_date: birth,
        height_cm: height,
        weight_kg: weight,
        goal_type: goal,
      }),
    });
  }

  async function createAccount() {
    if (!/.+@.+\..+/.test(email)) return setError(t.auth.errEmail);
    if (password.length < policy.password_min_length) return setError(t.auth.errPass);
    if (!agree) return setError(t.auth.errAgree);
    // Действующая редакция условий приходит из политики (§3.0). Без неё
    // аккаунт не создать: согласие записывается вместе с датой редакции, и
    // отправлять пустую значило бы получить невнятную ошибку валидации.
    if (!policy.terms_version) return setError(t.auth.errPolicy);

    setError('');
    setPending(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          display_name: name.trim() || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          accepted_terms_version: policy.terms_version,
        }),
      });

      const body = (await response.json()) as {
        stage?: 'code' | 'signed-in';
        registration_token?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(body.message ?? t.auth.errNetwork);
        return;
      }

      if (body.stage === 'signed-in') {
        await saveProfile();
        router.replace(route('/' + locale + '/app'));
        router.refresh();
        return;
      }

      setRegistrationToken(body.registration_token ?? '');
      setStep(4);
    } catch {
      setError(t.auth.errNetwork);
    } finally {
      setPending(false);
    }
  }

  async function confirmCode() {
    setError('');
    setPending(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_token: registrationToken, code: code.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setError(body.message ?? t.auth.errNetwork);
        return;
      }

      await saveProfile();
      router.replace(route('/' + locale + '/app'));
      router.refresh();
    } catch {
      setError(t.auth.errNetwork);
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setError('');
    await fetch('/api/auth/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_token: registrationToken }),
    });
  }

  function next() {
    if (step === 1 && !name.trim()) return setError(t.auth.errName);
    if (step === 3) return void createAccount();
    if (step === 4) return void confirmCode();
    setError('');
    setStep(step + 1);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      noValidate
    >
      <div className={styles.stepHead}>
        <p className={'kicker tnum ' + styles.kicker}>
          {t.auth.step} {step} {t.auth.stepOf} {totalSteps}
        </p>
        <span className={'tnum ' + styles.stepName}>{t.auth.stepNames[step - 1]}</span>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: (step / totalSteps) * 100 + '%' }} />
      </div>

      <h1 className={styles.title}>{step === 4 ? t.auth.codeTitle : stepText[0]}</h1>
      <p className={styles.lede}>{step === 4 ? t.auth.codeLede + ' ' + email : stepText[1]}</p>

      {step === 1 ? (
        <div className={styles.fields}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="ha-reg-name">{t.auth.name}</label>
            <input
              className="input"
              id="ha-reg-name"
              placeholder="Анна"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
            />
          </div>
          <DatePicker value={birth} onChange={setBirth} t={t} label={t.auth.birth} />
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="ha-reg-sex">{t.auth.sex}</label>
            <select
              className="input"
              id="ha-reg-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'f' | 'm')}
            >
              <option value="f">{t.auth.female}</option>
              <option value="m">{t.auth.male}</option>
            </select>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className={styles.fields} style={{ gap: 20 }}>
          <div className={styles.pair}>
            <div className="field">
              <label htmlFor="ha-reg-h">{t.auth.height}</label>
              <input
                className="input tnum"
                id="ha-reg-h"
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="ha-reg-w">{t.auth.weight}</label>
              <input
                className="input tnum"
                id="ha-reg-w"
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label>{t.auth.goal}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {t.auth.goals.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="btn btn-secondary"
                  aria-pressed={goal === key}
                  onClick={() => setGoal(key as Goal)}
                  style={
                    goal === key
                      ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent-700)' }
                      : undefined
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <dl className={styles.norms}>
            {[
              [t.summary.kcalRow, fmt(norms.kcal) + ' ' + t.today.kcal],
              [t.today.protein, norms.protein + ' г'],
              [t.today.fat, norms.fat + ' г'],
              [t.today.carbs, norms.carbs + ' г'],
            ].map(([label, value]) => (
              <div className={styles.normRow} key={label}>
                <dt>{label}</dt>
                <dd className={'tnum ' + styles.normValue}>{value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.note}>{t.auth.normsNote}</p>
        </div>
      ) : null}

      {step === 3 ? (
        <div className={styles.fields}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="ha-reg-mail">{t.auth.email}</label>
            <input
              className="input"
              id="ha-reg-mail"
              type="email"
              autoComplete="email"
              placeholder="anna@example.ru"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="ha-reg-pass">{t.auth.password}</label>
            <input
              className="input"
              id="ha-reg-pass"
              type="password"
              autoComplete="new-password"
              placeholder={t.auth.passPlaceholder}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
            />
          </div>
          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                setError('');
              }}
            />
            <span>
              {t.auth.agree} <Link href={route('/' + locale + '/legal/terms')}>{t.auth.terms}</Link>{' '}
              {t.auth.and}{' '}
              <Link href={route('/' + locale + '/legal/privacy')}>{t.auth.privacy}</Link>.
            </span>
          </label>
        </div>
      ) : null}

      {step === 4 ? (
        <div className={styles.fields}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="ha-reg-code">{t.auth.code}</label>
            <input
              className="input tnum"
              id="ha-reg-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={policy.code_length}
              placeholder={'0'.repeat(policy.code_length)}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
            />
          </div>
          <button type="button" className="btn btn-ghost" onClick={resend}>
            {t.auth.codeResend}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.stepActions}>
        {step > 1 && step < 4 ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setStep(step - 1);
              setError('');
            }}
          >
            {t.auth.back}
          </button>
        ) : null}
        <button type="submit" className={'btn btn-primary ' + styles.grow} disabled={pending}>
          {step === 4 ? t.auth.codeConfirm : step === 3 ? t.auth.create : t.auth.next}
        </button>
      </div>

      <p className={styles.altRow}>
        {t.auth.haveAccount} <Link href={route('/' + locale + '/login')}>{t.auth.signInLink}</Link>
      </p>
    </form>
  );
}
