import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { getAppDictionary } from '@/i18n/get-app-dictionary';
import { getDictionary } from '@/i18n/get-dictionary';

const t = getAppDictionary('en');
const site = getDictionary('en');

export const metadata: Metadata = { title: t.auth.loginKicker + ' — Health AI' };

export default function Page() {
  return (
    <AuthLayout locale="en" site={site}>
      <LoginForm locale="en" t={t} />
    </AuthLayout>
  );
}
