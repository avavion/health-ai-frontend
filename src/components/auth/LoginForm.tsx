'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Locale } from '@/i18n/config';
import type { AppDictionary } from '@/i18n/dictionaries/app.ru';
import styles from './auth.module.css';
import { route } from '@/lib/route';

/**
 * Вход (§4.1).
 *
 * Пароль уходит своему серверу, а тот — в API: токены в браузер не попадают
 * вовсе, они остаются в httpOnly-cookie. Ошибка приходит готовым текстом из
 * §2 — собирать его из кода незачем.
 */
export function LoginForm({ locale, t }: { locale: Locale; t: AppDictionary }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setError(body.message ?? t.auth.errNetwork);
        return;
      }

      // Куда человек шёл до заслона, туда его и вернём.
      const next = searchParams.get('next');
      router.replace(route(next && next.startsWith('/' + locale) ? next : '/' + locale + '/app'));
      router.refresh();
    } catch {
      setError(t.auth.errNetwork);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className={'kicker tnum ' + styles.kicker}>{t.auth.loginKicker}</p>
      <h1 className={styles.title}>{t.auth.loginTitle}</h1>
      <p className={styles.lede}>{t.auth.loginLede}</p>

      <div className="field">
        <label htmlFor="ha-login-mail">{t.auth.email}</label>
        <input
          className="input"
          id="ha-login-mail"
          type="email"
          autoComplete="email"
          required
          placeholder="anna@example.ru"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="ha-login-pass">{t.auth.password}</label>
        <input
          className="input"
          id="ha-login-pass"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <p className={styles.forgotRow}>
        <Link href={route('/' + locale + '/recover')}>{t.auth.forgot}</Link>
      </p>

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
        {pending ? t.auth.signingIn : t.auth.signIn}
      </button>

      <p className={styles.altRow}>
        {t.auth.noAccount} <Link href={route('/' + locale + '/register')}>{t.auth.register}</Link>
      </p>
    </form>
  );
}
