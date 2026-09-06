import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { getAppDictionary } from '@/i18n/get-app-dictionary';
import { getDictionary } from '@/i18n/get-dictionary';
import { loadAuthPolicy } from '@/lib/api/queries';

const t = getAppDictionary('en');
const site = getDictionary('en');

export const metadata: Metadata = { title: t.auth.register + ' — Health AI' };

/** Форма строится по политике регистрации (§3.0), а не по зашитому предположению. */
export default async function Page() {
  const policy = await loadAuthPolicy();

  return (
    <AuthLayout locale="en" site={site}>
      <RegisterForm locale="en" t={t} policy={policy} />
    </AuthLayout>
  );
}
