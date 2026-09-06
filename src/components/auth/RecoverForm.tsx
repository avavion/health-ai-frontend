'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Locale } from '@/i18n/config';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import styles from './auth.module.css';
import { route } from '@/lib/route';

type Stage = 'ask' | 'code' | 'done';

/**
 * Восстановление доступа (§4.5).
 *
 * Два шага в одной форме: запрос кода и ввод кода с новым паролем. Письмо
 * несёт и ссылку в приложение, и код строкой — на сайте работает второй путь,
 * потому что схему healthai:// браузер отдаёт системе не всегда.
 *
 * Ответ на первый шаг всегда одинаков, существует аккаунт или нет: иначе форма
 * превратилась бы в перечислитель зарегистрированных адресов.
 */
export function RecoverForm({ locale, t }: { locale: Locale; t: AppDictionary }) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('ask');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [revoked, setRevoked] = useState(0);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    if (!/.+@.+\..+/.test(email.trim())) return setError(t.auth.errEmail);

    setError('');
    setPending(true);
    try {
      await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStage('code');
    } catch {
      setError(t.auth.errNetwork);
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError(t.auth.errPass);

    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Пробелы и дефисы сервер выбрасывает сам, но чистить их здесь
        // дешевле, чем объяснять человеку, почему код «не подошёл».
        body: JSON.stringify({ token: code.trim(), new_password: password }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setError(body.message ?? t.auth.errNetwork);
        return;
      }

      const body = (await response.json()) as { revoked_sessions: number };
      setRevoked(body.revoked_sessions);
      setStage('done');
    } catch {
      setError(t.auth.errNetwork);
    } finally {
      setPending(false);
    }
  }

  if (stage === 'done') {
    return (
      <div>
        <p className={'kicker tnum ' + styles.kicker}>{t.auth.recoverKicker}</p>
        <h1 className={styles.title}>{t.auth.recoverDoneTitle}</h1>
        <p className={styles.lede}>
          {t.auth.recoverDoneBody} {revoked} {t.auth.recoverDoneTail}
        </p>
        <button
          type="button"
          className={'btn btn-primary btn-block ' + styles.submit}
          onClick={() => router.push(route('/' + locale + '/login'))}
        >
          {t.auth.signIn}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={stage === 'ask' ? requestCode : resetPassword} noValidate>
      <p className={'kicker tnum ' + styles.kicker}>{t.auth.recoverKicker}</p>
      <h1 className={styles.title}>
        {stage === 'ask' ? t.auth.recoverTitle : t.auth.recoverCodeTitle}
      </h1>
      <p className={styles.lede}>
        {stage === 'ask' ? t.auth.recoverLede : t.auth.recoverCodeLede}
      </p>

      {stage === 'ask' ? (
        <div className="field">
          <label htmlFor="ha-rec-mail">{t.auth.email}</label>
          <input
            className="input"
            id="ha-rec-mail"
            type="email"
            autoComplete="email"
            required
            placeholder="anna@example.ru"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
          />
        </div>
      ) : (
        <>
          <div className={styles.sent}>
            {t.auth.recoverSent} {email}. {t.auth.recoverSentTail}
          </div>
          <div className="field">
            <label htmlFor="ha-rec-code">{t.auth.code}</label>
            <input
              className="input tnum"
              id="ha-rec-code"
              inputMode="text"
              autoComplete="one-time-code"
              required
              placeholder="AB12CD"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="ha-rec-pass">{t.auth.newPassword}</label>
            <input
              className="input"
              id="ha-rec-pass"
              type="password"
              autoComplete="new-password"
              required
              placeholder={t.auth.passPlaceholder}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
            />
          </div>
        </>
      )}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className={'btn btn-primary btn-block ' + styles.submit}
        disabled={pending}
      >
        {stage === 'ask' ? t.auth.recoverSend : t.auth.recoverApply}
      </button>

      <p className={styles.altRow}>
        <Link href={route('/' + locale + '/login')}>{t.auth.backToLogin}</Link>
      </p>
    </form>
  );
}
