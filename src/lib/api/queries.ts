import { api, apiOptional, ApiError } from './client';
import { SITE_DEVICE_ID } from './meta';
import type {
  AuthPolicy,
  BasePage,
  DiaryDay,
  HealthDay,
  Meal,
  MealsPage,
  PersonalPage,
  Profile,
  Report,
  ReportsPage,
  DeviceSession,
} from './types';

/**
 * Чтение данных для экранов. Зовётся из серверных компонентов: страница
 * собирается уже с данными, без промежуточного состояния «пусто, сейчас
 * загрузим» — того самого, которое на медленной сети живёт дольше всего.
 */

/**
 * Политика на случай, когда её не удалось прочитать.
 *
 * Значения совпадают с настройками бэкенда по умолчанию. Это не догадка о
 * сервере, а разумная форма: сервер всё равно проверит всё сам, а форма,
 * которая не открылась из-за недоступного API, не даст человеку даже
 * попробовать.
 */
const fallbackPolicy: AuthPolicy = {
  email_verification: 'required',
  code_length: 6,
  code_ttl_seconds: 900,
  resend_after_seconds: 60,
  password_min_length: 8,
  terms_version: '',
};

/**
 * Политика регистрации (§3.0).
 *
 * Форма строится по ответу, а не по догадке: включат подтверждение почты или
 * выключат — сайт узнает об этом сам. Читается без сессии, поэтому и
 * устройство здесь — сайт, а не браузер человека.
 */
export async function loadAuthPolicy(): Promise<AuthPolicy> {
  try {
    return await api<AuthPolicy>({
      path: '/auth/policy',
      auth: false,
      deviceId: SITE_DEVICE_ID,
      // Политика меняется настройкой сервиса, а не по ходу дня: минуты кэша
      // хватает, чтобы не спрашивать её на каждый заход на форму.
      revalidate: 60,
      tags: ['auth-policy'],
    });
  } catch {
    return fallbackPolicy;
  }
}

export function loadProfile(): Promise<Profile> {
  return api<Profile>({ path: '/me/profile' });
}

export function loadDiaryDays(limit = 30): Promise<DiaryDay[]> {
  return api<{ days: DiaryDay[] }>({ path: '/diary/days', query: { limit } }).then((r) => r.days);
}

export function loadMeals(date: string, timezone: string): Promise<Meal[]> {
  return api<MealsPage>({ path: '/diary/meals', query: { date, timezone } }).then((r) => r.meals);
}

export function loadHealthDays(from: string, to: string): Promise<HealthDay[]> {
  return api<{ days: HealthDay[] }>({ path: '/health/days', query: { from, to } }).then(
    (r) => r.days,
  );
}

export function loadReports(limit = 30): Promise<ReportsPage> {
  return api<ReportsPage>({ path: '/reports', query: { limit } });
}

export function loadReport(date: string): Promise<Report | null> {
  return apiOptional<Report>({ path: '/reports/' + date });
}

export function loadPersonalCatalog(limit = 200): Promise<PersonalPage> {
  return api<PersonalPage>({ path: '/catalog/personal', query: { limit } });
}

export function searchBaseCatalog(query: string, limit = 20): Promise<BasePage> {
  return api<BasePage>({ path: '/catalog/base/search', query: { q: query, limit } });
}

export function loadSessions(): Promise<DeviceSession[]> {
  return api<{ sessions: DeviceSession[] }>({ path: '/auth/sessions' }).then(
    (r) => r.sessions ?? [],
  );
}

/**
 * Мягкое чтение: 401 и 403 превращаются в null.
 *
 * Экран дня собирается из четырёх источников, и отсутствие одного из них —
 * обычное состояние, а не поломка: отчёта за сегодня ещё нет, данные Здоровья
 * приходят только с телефона. Ронять из-за этого весь экран нельзя.
 */
export async function optional<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }
}
