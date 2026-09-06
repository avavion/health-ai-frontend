/**
 * Формы ответов API, которые нужны сайту. Имена полей — snake_case, как в §1
 * контракта: переименовывать их на границе значило бы держать вторую карту
 * соответствий и сверять её при каждой правке.
 */

export interface Nutrients {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

// MARK: - Аутентификация (§3–4)

export interface UserView {
  id: string;
  email: string;
  email_verified: boolean;
  display_name: string | null;
  timezone: string;
  created_at: string;
}

export interface SessionView {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
}

export interface AuthResult {
  user: UserView;
  session: SessionView;
  profile_bootstrapped: boolean;
  catalog_base_version: number;
}

export interface PendingRegistration {
  registration_token: string;
  email: string;
  code_length: number;
  expires_in: number;
  resend_after: number;
}

export interface AuthPolicy {
  email_verification: 'required' | 'soft' | 'off';
  code_length: number;
  code_ttl_seconds: number;
  resend_after_seconds: number;
  password_min_length: number;
  terms_version: string;
}

export interface DeviceSession {
  id: string;
  device_name: string | null;
  app_version: string | null;
  os_version: string | null;
  city: string | null;
  country: string | null;
  is_suspicious: boolean;
  created_at: string;
  last_seen_at: string;
  is_current: boolean;
}

// MARK: - Профиль (§5)

export interface CustomGoals {
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

export interface Profile {
  id: string;
  sex: 'male' | 'female';
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';
  goal_type: 'cut' | 'maintain' | 'bulk';
  custom_goals: CustomGoals;
  notes_for_ai: string;
  accepted_terms_version: string;
  accepted_terms_at: string | null;
  computed: {
    basal_metabolic_rate: number;
    estimated_tdee: number;
    observed_tdee: number | null;
    goals: Nutrients;
  };
  updated_at: string;
  revision: number;
}

// MARK: - Дневник (§7)

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ItemSource = 'catalog' | 'catalog_via_ai' | 'ai_estimate' | 'manual';

export interface MealItem {
  id: string;
  name: string;
  grams: number;
  nutrients: Nutrients;
  source: ItemSource;
  catalog_key: string | null;
  sort_index: number;
}

export interface Meal {
  id: string;
  eaten_at: string;
  meal_type: MealType;
  raw_text: string;
  items: MealItem[];
  client_updated_at: string;
  updated_at: string;
  revision: number;
}

export interface MealsPage {
  meals: Meal[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface DiaryDay {
  date: string;
  meals: number;
  totals: Nutrients;
  updated_at: string;
}

// MARK: - Данные Здоровья (§9)

export interface HealthDay {
  date: string;
  timezone: string;
  is_available: boolean;
  activity: {
    steps: number | null;
    active_energy_kcal: number | null;
    basal_energy_kcal: number | null;
    exercise_minutes: number | null;
    stand_hours: number | null;
  };
  body: {
    weight_kg: number | null;
    measured_at: string | null;
    body_fat_percent: number | null;
    lean_mass_kg: number | null;
  };
  workouts: { id: string; name: string; duration_minutes: number }[];
  revision: number;
}

// MARK: - Каталог (§8)

export interface Per100g {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface BaseItem {
  id: string;
  display_name: string;
  per_100g: Per100g;
  aliases: string[];
  default_serving_grams: number | null;
  preferred_unit: string | null;
  category: string | null;
  locale: string;
  revision: number;
}

export interface BasePage {
  version: number;
  items: BaseItem[];
  removed: string[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface PersonalItem {
  key: string;
  display_name: string;
  base_id: string | null;
  per_100g: Per100g;
  aliases: string[];
  default_serving_grams: number | null;
  preferred_unit: string | null;
  usage_count: number;
  last_used_at: string | null;
  is_user_confirmed: boolean;
  client_updated_at: string;
  revision: number;
}

export interface PersonalPage {
  items: PersonalItem[];
  next_cursor: string | null;
  has_more: boolean;
}

// MARK: - Отчёты (§9.4)

export interface ReportSummary {
  date: string;
  score: number | null;
  summary: string;
  created_at: string;
  revision: number;
}

export interface ReportsPage {
  reports: ReportSummary[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface Report extends ReportSummary {
  body: string;
  model: string;
  snapshot: unknown;
  snapshot_hash: string;
  generated_at: string;
}

// MARK: - Разбор еды (§6.5)

export interface ResolvedItem {
  name: string;
  catalog_key: string | null;
  grams: number;
  per_100g: Per100g;
  confidence: 'low' | 'medium' | 'high';
  note: string | null;
}

export interface FoodResolveResult {
  items: ResolvedItem[];
  unresolved_fragments: string[];
  warnings: string[];
  catalog_stale: boolean;
}
