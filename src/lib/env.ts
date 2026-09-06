function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error('Не задана переменная окружения ' + name);
  return value;
}

export const env = {
  apiBaseUrl: () => required('API_BASE_URL', 'http://localhost:8080/v1').replace(/\/+$/, ''),
  legalRevalidate: () => Number(process.env.LEGAL_REVALIDATE_SECONDS ?? 3600),
  siteUrl: () => required('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
  supportEmail: () => process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@healthai.app',
};
