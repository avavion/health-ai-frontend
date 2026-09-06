'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Locale } from '@/i18n/config';
import { route } from '@/lib/route';

/**
 * Выход из аккаунта.
 *
 * Кнопка, а не ссылка: выход — это запрос, который отзывает сессию на сервере
 * и стирает cookie. Ссылка на /login оставила бы человека внутри аккаунта,
 * показав ему форму входа.
 */
export function SignOutButton({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
          // Даже если запрос не дошёл, cookie стёрты сервером не будут —
          // но оставаться на экране дневника после нажатия «выйти» человек
          // не должен: вход покажет ему настоящее положение дел.
          router.replace(route('/' + locale + '/login'));
          router.refresh();
        }
      }}
    >
      {label}
    </button>
  );
}
