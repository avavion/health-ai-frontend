'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/ru';
import { supportTopics, type SupportResponse, type SupportTopic } from '@/lib/support';
import styles from './support.module.css';
import { route } from '@/lib/route';

type Labels = Dictionary['support']['form'];

interface Sent {
  ticket: string;
  email: string;
  topic: SupportTopic;
}

export function SupportForm({
  locale,
  t,
  privacyHref,
}: {
  locale: Locale;
  t: Labels;
  privacyHref: string;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<SupportTopic>('app-question');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!/.+@.+\..+/.test(email.trim())) return setError(t.errors.email);
    if (message.trim().length < 10) return setError(t.errors.message);
    if (!consent) return setError(t.errors.consent);

    setError('');
    setPending(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          topic,
          message: message.trim(),
          consent: true,
          locale,
          userAgent: navigator.userAgent,
        }),
      });

      const body = (await res.json()) as SupportResponse;

      if (body.status === 'accepted') {
        setSent({ ticket: body.ticket, email: email.trim(), topic });
      } else if (res.status === 429) {
        setError(t.errors.tooOften);
      } else {
        setError(t.errors.network);
      }
    } catch {
      setError(t.errors.network);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.card}>
        <p className={styles.doneKicker}>{t.done.kicker}</p>
        <h3 className={styles.doneTitle}>{t.done.title}</h3>
        <p className={styles.doneBody}>
          {t.done.body} {sent.email}. {t.done.ticket} —{' '}
          <span className={'tnum ' + styles.ticket}>{sent.ticket}</span>. {t.done.answer}
        </p>
        <hr className="hr" />
        <p className={styles.doneRow}>
          <span>{t.done.topic}</span>
          <span>{t.topics[sent.topic]}</span>
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => setSent(null)}>
          {t.done.again}
        </button>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="support-name">{t.name}</label>
        <input
          className="input"
          id="support-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder={t.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="support-email">{t.email}</label>
        <input
          className="input"
          id="support-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="support-topic">{t.topic}</label>
        <select
          className="input"
          id="support-topic"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value as SupportTopic)}
        >
          {supportTopics.map((value) => (
            <option value={value} key={value}>
              {t.topics[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="support-message">{t.message}</label>
        <textarea
          className="input"
          id="support-message"
          name="message"
          rows={5}
          required
          placeholder={t.messagePlaceholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <label className={styles.consent}>
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          {t.consent} <Link href={route(privacyHref)}>{t.privacyLink}</Link>
        </span>
      </label>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? t.sending : t.submit}
      </button>

      <p className={styles.footnote}>{t.footnote}</p>
    </form>
  );
}
